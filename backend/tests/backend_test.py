"""Lebo backend regression tests.

Covers: Auth, ownership isolation, contacts CRUD + reorder + invitations,
emergency engine, safety timers + check-ins, journeys, modes,
location shares, incidents, safety plan, support directory, chatbot,
app lock, account export/delete.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"
API = f"{BASE_URL}/api"

TEST_EMAIL = "kat@test.com"
TEST_PASSWORD = "secret123"


def _unique_email(prefix="test"):
    return f"test_{prefix}_{uuid.uuid4().hex[:8]}@example.com"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def user_a(s):
    # Register a fresh user A for isolation tests
    email = _unique_email("A")
    r = s.post(f"{API}/auth/register",
               json={"name": "Alice A", "email": email, "password": "pw123456"})
    assert r.status_code == 201, r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "email": email}


@pytest.fixture(scope="module")
def user_b(s):
    email = _unique_email("B")
    r = s.post(f"{API}/auth/register",
               json={"name": "Bob B", "email": email, "password": "pw123456"})
    assert r.status_code == 201, r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "email": email}


def h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_health(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200 and r.json().get("status") == "ok"

    def test_login_seeded_user(self, s):
        r = s.post(f"{API}/auth/login",
                   json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        # Test user may or may not exist; register if missing
        if r.status_code == 401:
            reg = s.post(f"{API}/auth/register",
                         json={"name": "Katlego", "email": TEST_EMAIL, "password": TEST_PASSWORD})
            assert reg.status_code in (201, 409)
            r = s.post(f"{API}/auth/login",
                       json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "token" in j and j["user"]["email"] == TEST_EMAIL

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/auth/login",
                   json={"email": TEST_EMAIL, "password": "wrongpw"})
        assert r.status_code == 401

    def test_me_requires_token(self, s):
        r = s.get(f"{API}/me")
        assert r.status_code == 401

    def test_me_and_update(self, s, user_a):
        r = s.get(f"{API}/me", headers=h(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == user_a["email"].lower()
        r = s.put(f"{API}/me", headers=h(user_a["token"]),
                  json={"phone": "+27110000000"})
        assert r.status_code == 200 and r.json()["phone"] == "+27110000000"

    def test_logout(self, s):
        email = _unique_email("logout")
        reg = s.post(f"{API}/auth/register",
                     json={"name": "L", "email": email, "password": "pw123456"}).json()
        tok = reg["token"]
        assert s.post(f"{API}/auth/logout", headers=h(tok)).status_code == 204
        assert s.get(f"{API}/me", headers=h(tok)).status_code == 401


# ---------- Contacts CRUD + reorder + invitations ----------
class TestContacts:
    def test_crud_reorder(self, s, user_a):
        tok = user_a["token"]
        ids = []
        for name in ("Mom", "Sister", "Friend"):
            r = s.post(f"{API}/emergency-contacts", headers=h(tok),
                       json={"name": name, "phone": "+27110000001",
                             "relationship": "family"})
            assert r.status_code == 201, r.text
            ids.append(r.json()["id"])

        # List
        rows = s.get(f"{API}/emergency-contacts", headers=h(tok)).json()
        assert len(rows) >= 3

        # Update
        r = s.put(f"{API}/emergency-contacts/{ids[0]}", headers=h(tok),
                  json={"name": "Mama", "phone": "+27110000009",
                        "relationship": "family"})
        assert r.status_code == 200 and r.json()["name"] == "Mama"

        # Reorder
        reversed_ids = list(reversed(ids))
        r = s.post(f"{API}/emergency-contacts/reorder", headers=h(tok),
                   json={"orderedIds": reversed_ids})
        assert r.status_code == 200
        priority_ids = [c["id"] for c in r.json() if c["id"] in reversed_ids]
        assert priority_ids[:3] == reversed_ids

        # Delete
        assert s.delete(f"{API}/emergency-contacts/{ids[2]}",
                        headers=h(tok)).status_code == 204
        remaining = [c["id"] for c in s.get(f"{API}/emergency-contacts",
                                            headers=h(tok)).json()]
        assert ids[2] not in remaining

    def test_invitation(self, s, user_a):
        r = s.post(f"{API}/emergency-contacts/invitations",
                   headers=h(user_a["token"]),
                   json={"name": "Cousin", "phone": "+27110000005"})
        assert r.status_code == 200
        assert "link" in r.json() and "invitationId" in r.json()


# ---------- Ownership isolation ----------
class TestOwnershipIsolation:
    def test_user_b_cannot_read_a_contact(self, s, user_a, user_b):
        r = s.post(f"{API}/emergency-contacts", headers=h(user_a["token"]),
                   json={"name": "Secret", "phone": "+27110000099"})
        cid = r.json()["id"]
        # B cannot update/delete A's contact
        r_upd = s.put(f"{API}/emergency-contacts/{cid}", headers=h(user_b["token"]),
                      json={"name": "Hack", "phone": "+2700"})
        assert r_upd.status_code == 404
        r_del = s.delete(f"{API}/emergency-contacts/{cid}", headers=h(user_b["token"]))
        assert r_del.status_code == 404
        # B's list should not include A's contact
        b_ids = [c["id"] for c in s.get(f"{API}/emergency-contacts",
                                        headers=h(user_b["token"])).json()]
        assert cid not in b_ids

    def test_user_b_cannot_read_a_incident(self, s, user_a, user_b):
        r = s.post(f"{API}/incidents", headers=h(user_a["token"]),
                   json={"category": "private", "description": "TEST secret"})
        iid = r.json()["id"]
        assert s.get(f"{API}/incidents/{iid}",
                     headers=h(user_b["token"])).status_code == 404
        assert s.put(f"{API}/incidents/{iid}", headers=h(user_b["token"]),
                     json={"category": "x", "description": "y"}).status_code == 404

    def test_user_b_cannot_read_a_event(self, s, user_a, user_b):
        r = s.post(f"{API}/emergency/activate", headers=h(user_a["token"]),
                   json={"trigger": "manual", "shareLocation": False})
        assert r.status_code == 201, r.text
        eid = r.json()["id"]
        assert s.get(f"{API}/emergency/{eid}",
                     headers=h(user_b["token"])).status_code == 404
        assert s.post(f"{API}/emergency/{eid}/cancel",
                      headers=h(user_b["token"])).status_code == 404
        # A cancels
        assert s.post(f"{API}/emergency/{eid}/cancel",
                      headers=h(user_a["token"])).status_code == 200


# ---------- Emergency engine ----------
class TestEmergency:
    def test_activate_notifies_contacts_and_cancel(self, s, user_b):
        tok = user_b["token"]
        s.post(f"{API}/emergency-contacts", headers=h(tok),
               json={"name": "Buddy", "phone": "+27000",
                     "canReceiveEmergency": True})
        r = s.post(f"{API}/emergency/activate", headers=h(tok),
                   json={"trigger": "manual", "lat": -26.2, "lng": 28.0,
                         "shareLocation": True})
        assert r.status_code == 201
        ev = r.json()
        assert ev["status"] == "active"
        assert len(ev["notifications"]) >= 1
        # active endpoint
        r_active = s.get(f"{API}/emergency/active", headers=h(tok))
        assert r_active.status_code == 200 and r_active.json()["id"] == ev["id"]
        # user safetyStatus updated
        me = s.get(f"{API}/me", headers=h(tok)).json()
        assert me["safetyStatus"] == "emergency"
        # acknowledge
        contact_id = ev["notifications"][0]["contactId"]
        r_ack = s.post(f"{API}/emergency/{ev['id']}/acknowledge", headers=h(tok),
                       json={"contactId": contact_id, "response": "contacting"})
        assert r_ack.status_code == 200
        assert any(n.get("acknowledgement") == "contacting"
                   for n in r_ack.json()["notifications"])
        # cancel
        r_c = s.post(f"{API}/emergency/{ev['id']}/cancel", headers=h(tok))
        assert r_c.status_code == 200 and r_c.json()["status"] == "cancelled"
        me = s.get(f"{API}/me", headers=h(tok)).json()
        assert me["safetyStatus"] == "safe"


# ---------- Timers + check-ins ----------
class TestTimers:
    def test_timer_and_checkin(self, s, user_a):
        tok = user_a["token"]
        r = s.post(f"{API}/safety-timers", headers=h(tok),
                   json={"intervalMinutes": 30, "gracePeriodMinutes": 10})
        assert r.status_code == 201
        tid = r.json()["id"]
        first_next = r.json()["nextCheckin"]

        time.sleep(1.1)
        r_ci = s.post(f"{API}/checkins", headers=h(tok))
        assert r_ci.status_code == 200
        me = s.get(f"{API}/me", headers=h(tok)).json()
        assert me["safetyStatus"] == "safe"
        # nextCheckin advanced
        timers = s.get(f"{API}/safety-timers", headers=h(tok)).json()
        for t in timers:
            if t["id"] == tid:
                assert t["nextCheckin"] != first_next
        # stop
        assert s.delete(f"{API}/safety-timers/{tid}",
                        headers=h(tok)).status_code == 204


# ---------- Journeys / Modes / Shares ----------
class TestJourneyModeShare:
    def test_journey_flow(self, s, user_a):
        tok = user_a["token"]
        r = s.post(f"{API}/journeys", headers=h(tok),
                   json={"destination": "Home", "expectedArrival": "2026-01-01T00:00:00Z"})
        assert r.status_code == 201
        jid = r.json()["id"]
        r_c = s.post(f"{API}/journeys/{jid}/complete", headers=h(tok))
        assert r_c.status_code == 200 and r_c.json()["status"] == "completed"

    def test_mode_activate(self, s, user_a):
        tok = user_a["token"]
        r = s.post(f"{API}/modes", headers=h(tok),
                   json={"name": "TEST Mode", "type": "work"})
        assert r.status_code == 201
        mid = r.json()["id"]
        r_act = s.post(f"{API}/modes/{mid}/activate", headers=h(tok))
        assert r_act.status_code == 200 and r_act.json()["active"] is True
        me = s.get(f"{API}/me", headers=h(tok)).json()
        assert me["currentMode"] == "TEST Mode"
        s.delete(f"{API}/modes/{mid}", headers=h(tok))

    def test_location_share(self, s, user_a):
        tok = user_a["token"]
        c = s.post(f"{API}/emergency-contacts", headers=h(tok),
                   json={"name": "Share Target", "phone": "+27000"}).json()
        r = s.post(f"{API}/location-shares", headers=h(tok),
                   json={"contactId": c["id"], "mode": "live",
                         "durationMinutes": 30})
        assert r.status_code == 201
        sid = r.json()["id"]
        # Invalid contact
        r_bad = s.post(f"{API}/location-shares", headers=h(tok),
                       json={"contactId": "nonexistent", "mode": "live"})
        assert r_bad.status_code == 404
        assert s.delete(f"{API}/location-shares/{sid}",
                        headers=h(tok)).status_code == 204
        ids = [x["id"] for x in s.get(f"{API}/location-shares",
                                      headers=h(tok)).json()]
        assert sid not in ids


# ---------- Incidents ----------
class TestIncidents:
    def test_crud_soft_delete(self, s, user_a):
        tok = user_a["token"]
        r = s.post(f"{API}/incidents", headers=h(tok),
                   json={"category": "verbal", "description": "TEST incident"})
        assert r.status_code == 201
        iid = r.json()["id"]
        r_g = s.get(f"{API}/incidents/{iid}", headers=h(tok))
        assert r_g.status_code == 200
        r_u = s.put(f"{API}/incidents/{iid}", headers=h(tok),
                    json={"category": "verbal", "description": "TEST updated"})
        assert r_u.status_code == 200 and r_u.json()["description"] == "TEST updated"
        assert s.delete(f"{API}/incidents/{iid}",
                        headers=h(tok)).status_code == 204
        ids = [i["id"] for i in s.get(f"{API}/incidents",
                                      headers=h(tok)).json()]
        assert iid not in ids


# ---------- Safety plan ----------
class TestSafetyPlan:
    def test_upsert(self, s, user_a):
        tok = user_a["token"]
        r = s.put(f"{API}/safety-plan", headers=h(tok),
                  json={"data": {"warningSigns": ["stress"]}})
        assert r.status_code == 200
        r_g = s.get(f"{API}/safety-plan", headers=h(tok))
        assert r_g.status_code == 200
        assert r_g.json()["data"]["warningSigns"] == ["stress"]


# ---------- Support directory ----------
class TestSupport:
    def test_list_and_filter(self, s, user_a):
        tok = user_a["token"]
        r = s.get(f"{API}/support", headers=h(tok))
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 10  # seeded orgs
        # Category filter
        r_p = s.get(f"{API}/support?category=police", headers=h(tok)).json()
        assert all(x["category"] == "police" for x in r_p) and len(r_p) >= 1
        # Search
        r_q = s.get(f"{API}/support?q=SAPS", headers=h(tok)).json()
        assert any("SAPS" in x["name"] for x in r_q)
        # Distance sort
        r_d = s.get(f"{API}/support?lat=-33.9&lng=18.4", headers=h(tok)).json()
        dists = [x["distanceKm"] for x in r_d if x["distanceKm"] is not None]
        assert dists == sorted(dists)

    def test_categories(self, s, user_a):
        r = s.get(f"{API}/support/categories", headers=h(user_a["token"]))
        assert r.status_code == 200 and len(r.json()) >= 6


# ---------- Chatbot ----------
class TestChatbot:
    def test_send_and_history(self, s, user_a):
        tok = user_a["token"]
        r = s.post(f"{API}/chat/message", headers=h(tok),
                   json={"message": "Hi, I feel unsafe walking home."},
                   timeout=60)
        assert r.status_code == 200
        j = r.json()
        assert j.get("reply") and j.get("sessionId")
        sid = j["sessionId"]
        r_h = s.get(f"{API}/chat/messages?sessionId={sid}", headers=h(tok))
        assert r_h.status_code == 200 and len(r_h.json()) >= 2


# ---------- App lock ----------
class TestAppLock:
    def test_enable_and_verify(self, s):
        # Fresh user to avoid state pollution
        email = _unique_email("lock")
        reg = s.post(f"{API}/auth/register",
                     json={"name": "L", "email": email, "password": "pw123456"}).json()
        tok = reg["token"]
        r = s.put(f"{API}/me/app-lock", headers=h(tok),
                  json={"enabled": True, "method": "pin", "pin": "1234"})
        assert r.status_code == 200 and r.json()["hasPin"] is True
        r_ok = s.post(f"{API}/me/app-lock/verify", headers=h(tok),
                      json={"pin": "1234"})
        assert r_ok.status_code == 200
        r_bad = s.post(f"{API}/me/app-lock/verify", headers=h(tok),
                       json={"pin": "9999"})
        assert r_bad.status_code == 401


# ---------- Account export / delete ----------
class TestAccount:
    def test_export(self, s, user_a):
        r = s.get(f"{API}/account/export", headers=h(user_a["token"]))
        assert r.status_code == 200
        j = r.json()
        for k in ("profile", "contacts", "incidents", "emergencyEvents",
                  "journeys", "exportedAt"):
            assert k in j

    def test_delete_revokes_session(self, s):
        email = _unique_email("del")
        reg = s.post(f"{API}/auth/register",
                     json={"name": "D", "email": email, "password": "pw123456"}).json()
        tok = reg["token"]
        r = s.delete(f"{API}/account", headers=h(tok))
        assert r.status_code == 204
        assert s.get(f"{API}/me", headers=h(tok)).status_code == 401
