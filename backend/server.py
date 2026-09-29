"""Lebo — Personal Safety & Support Platform backend.

A single-file FastAPI service backing the Lebo mobile app. Every feature
ultimately routes into one central Emergency Response engine.

Modules covered here: Auth, Profile/Settings, Emergency Contacts, Emergency
engine + escalation, Safety Timers + Check-ins, Safe Journeys, Modes,
Location shares, Incident Journal, Support Directory (Find Help Nearby),
Safety Plan and the AI Safety Chatbot.
"""

import os
import math
import uuid
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("lebo")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_DAYS = 30
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

ph = PasswordHasher()
bearer = HTTPBearer(auto_error=False)

app = FastAPI(title="Lebo Safety API")
api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return r * 2 * math.asin(math.sqrt(a))


def auth_error(detail="Invalid or expired authentication token"):
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail,
                         headers={"WWW-Authenticate": "Bearer"})


def make_token(user_id: str, sid: str) -> str:
    now = now_utc()
    payload = {"sub": user_id, "sid": sid, "iat": now, "exp": now + timedelta(days=ACCESS_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds or creds.scheme.lower() != "bearer":
        raise auth_error()
    try:
        claims = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        uid, sid = claims["sub"], claims["sid"]
    except Exception:
        raise auth_error()
    session = await db.sessions.find_one({"_id": sid, "userId": uid, "revokedAt": None})
    if not session:
        raise auth_error()
    user = await db.users.find_one({"_id": uid}, {"passwordHash": 0})
    if not user:
        raise auth_error()
    user["sid"] = sid
    return user


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    safetyStatus: Optional[str] = None
    currentMode: Optional[str] = None
    locationSharingDefault: Optional[str] = None
    analyticsOptIn: Optional[bool] = None


class AppLockUpdate(BaseModel):
    enabled: bool
    method: Optional[Literal["biometric", "pin", "none"]] = "none"
    timeout: Optional[Literal["immediate", "1min", "5min"]] = "immediate"
    pin: Optional[str] = None


class ContactIn(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = ""
    email: Optional[str] = ""
    notifyMethod: Optional[str] = "sms"
    canReceiveLocation: bool = True
    canReceiveMissedCheckin: bool = True
    canReceiveEmergency: bool = True


class ReorderIn(BaseModel):
    orderedIds: List[str]


class EmergencyActivateIn(BaseModel):
    trigger: Literal["manual", "voice", "auto", "physical", "codeword"] = "manual"
    lat: Optional[float] = None
    lng: Optional[float] = None
    shareLocation: bool = True
    note: Optional[str] = ""


class TimerIn(BaseModel):
    intervalMinutes: int
    gracePeriodMinutes: int = 15
    endTime: Optional[str] = None
    label: Optional[str] = "Safety timer"


class JourneyIn(BaseModel):
    destination: str
    expectedArrival: str
    contactId: Optional[str] = None
    checkinMinutes: int = 30
    shareLocation: bool = True


class ModeIn(BaseModel):
    name: str
    type: Literal["personal", "work", "event", "journey", "custom"] = "custom"
    checkinMinutes: Optional[int] = None
    gracePeriodMinutes: int = 15
    locationSharing: str = "emergency"
    schedule: Optional[dict] = None
    eventDetails: Optional[dict] = None
    contactIds: List[str] = []


class LocationShareIn(BaseModel):
    contactId: str
    mode: Literal["once", "live", "emergency", "journey", "until"] = "live"
    durationMinutes: Optional[int] = 30
    lat: Optional[float] = None
    lng: Optional[float] = None


class IncidentIn(BaseModel):
    category: str
    description: str
    location: Optional[str] = ""
    peopleInvolved: Optional[str] = ""
    occurredAt: Optional[str] = None
    media: List[dict] = []


class SafetyPlanIn(BaseModel):
    data: dict


class ChatIn(BaseModel):
    sessionId: Optional[str] = None
    message: str


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
def public_user(u: dict) -> dict:
    return {
        "id": u["_id"],
        "name": u.get("name", ""),
        "email": u.get("email", ""),
        "phone": u.get("phone", ""),
        "safetyStatus": u.get("safetyStatus", "none"),
        "currentMode": u.get("currentMode", "Personal"),
        "locationSharingDefault": u.get("locationSharingDefault", "emergency"),
        "analyticsOptIn": u.get("analyticsOptIn", False),
        "appLock": u.get("appLock", {"enabled": False, "method": "none", "timeout": "immediate", "hasPin": False}),
        "onboarded": u.get("onboarded", False),
        "createdAt": iso(u.get("createdAt")),
    }


async def audit(user_id: str, action: str, meta: Optional[dict] = None):
    await db.audit_logs.insert_one({
        "_id": new_id(), "userId": user_id, "action": action,
        "meta": meta or {}, "at": now_utc(),
    })


@api.get("/")
async def root():
    return {"app": "Lebo", "status": "ok"}


@api.post("/auth/register", status_code=201)
async def register(body: RegisterIn):
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email is already registered")
    uid, sid, now = new_id(), new_id(), now_utc()
    await db.users.insert_one({
        "_id": uid, "name": body.name.strip(), "email": email,
        "passwordHash": ph.hash(body.password), "phone": "",
        "safetyStatus": "none", "currentMode": "Personal",
        "locationSharingDefault": "emergency", "analyticsOptIn": False,
        "appLock": {"enabled": False, "method": "none", "timeout": "immediate", "hasPin": False},
        "onboarded": False, "createdAt": now,
    })
    await db.sessions.insert_one({"_id": sid, "userId": uid, "createdAt": now, "revokedAt": None})
    user = await db.users.find_one({"_id": uid}, {"passwordHash": 0})
    await audit(uid, "auth.register")
    return {"token": make_token(uid, sid), "user": public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(401, "Incorrect email or password")
    try:
        ph.verify(user["passwordHash"], body.password)
    except VerifyMismatchError:
        raise HTTPException(401, "Incorrect email or password")
    sid, now = new_id(), now_utc()
    await db.sessions.insert_one({"_id": sid, "userId": user["_id"], "createdAt": now, "revokedAt": None})
    await audit(user["_id"], "auth.login")
    return {"token": make_token(user["_id"], sid), "user": public_user(user)}


@api.post("/auth/logout", status_code=204)
async def logout(user=Depends(current_user)):
    await db.sessions.update_one({"_id": user["sid"]}, {"$set": {"revokedAt": now_utc()}})


@api.get("/me")
async def get_me(user=Depends(current_user)):
    return public_user(user)


@api.put("/me")
async def update_me(body: ProfileUpdate, user=Depends(current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"_id": user["_id"]}, {"passwordHash": 0})
    return public_user(fresh)


@api.post("/me/onboarded")
async def mark_onboarded(user=Depends(current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"onboarded": True}})
    return {"ok": True}


@api.put("/me/app-lock")
async def update_app_lock(body: AppLockUpdate, user=Depends(current_user)):
    lock = {"enabled": body.enabled, "method": body.method or "none",
            "timeout": body.timeout or "immediate"}
    current = user.get("appLock", {})
    lock["hasPin"] = current.get("hasPin", False)
    if body.pin:
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"appLockPinHash": ph.hash(body.pin)}})
        lock["hasPin"] = True
    if body.method != "pin" and not body.enabled:
        lock["hasPin"] = current.get("hasPin", False)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"appLock": lock}})
    await audit(user["_id"], "settings.app_lock", {"enabled": body.enabled, "method": body.method})
    return lock


class PinVerifyIn(BaseModel):
    pin: str


@api.post("/me/app-lock/verify")
async def verify_pin(body: PinVerifyIn, user=Depends(current_user)):
    full = await db.users.find_one({"_id": user["_id"]})
    h = full.get("appLockPinHash")
    if not h:
        raise HTTPException(400, "No PIN configured")
    try:
        ph.verify(h, body.pin)
    except VerifyMismatchError:
        raise HTTPException(401, "Incorrect PIN")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Emergency Contacts
# ---------------------------------------------------------------------------
def public_contact(c: dict) -> dict:
    c = dict(c)
    c["id"] = c.pop("_id")
    c.pop("userId", None)
    c["createdAt"] = iso(c.get("createdAt"))
    return c


@api.get("/emergency-contacts")
async def list_contacts(user=Depends(current_user)):
    rows = await db.emergency_contacts.find({"userId": user["_id"], "deletedAt": None}).sort("priority", 1).to_list(200)
    return [public_contact(c) for c in rows]


@api.post("/emergency-contacts", status_code=201)
async def create_contact(body: ContactIn, user=Depends(current_user)):
    count = await db.emergency_contacts.count_documents({"userId": user["_id"], "deletedAt": None})
    doc = {"_id": new_id(), "userId": user["_id"], "priority": count,
           "createdAt": now_utc(), "deletedAt": None, **body.model_dump()}
    await db.emergency_contacts.insert_one(doc)
    return public_contact(doc)


@api.put("/emergency-contacts/{cid}")
async def update_contact(cid: str, body: ContactIn, user=Depends(current_user)):
    res = await db.emergency_contacts.find_one_and_update(
        {"_id": cid, "userId": user["_id"], "deletedAt": None},
        {"$set": body.model_dump()}, return_document=True)
    if not res:
        raise HTTPException(404, "Contact not found")
    return public_contact(res)


@api.delete("/emergency-contacts/{cid}", status_code=204)
async def delete_contact(cid: str, user=Depends(current_user)):
    res = await db.emergency_contacts.update_one(
        {"_id": cid, "userId": user["_id"], "deletedAt": None}, {"$set": {"deletedAt": now_utc()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Contact not found")


@api.post("/emergency-contacts/reorder")
async def reorder_contacts(body: ReorderIn, user=Depends(current_user)):
    for i, cid in enumerate(body.orderedIds):
        await db.emergency_contacts.update_one({"_id": cid, "userId": user["_id"]}, {"$set": {"priority": i}})
    rows = await db.emergency_contacts.find({"userId": user["_id"], "deletedAt": None}).sort("priority", 1).to_list(200)
    return [public_contact(c) for c in rows]


class InviteIn(BaseModel):
    name: str
    phone: Optional[str] = ""


@api.post("/emergency-contacts/invitations")
async def create_invitation(body: InviteIn, user=Depends(current_user)):
    token = new_id()
    doc = {"_id": token, "userId": user["_id"], "inviterName": user.get("name", ""),
           "name": body.name, "phone": body.phone, "status": "pending", "createdAt": now_utc()}
    await db.emergency_contact_invitations.insert_one(doc)
    return {"invitationId": token, "link": f"https://lebo.app/invite/{token}",
            "message": f"{user.get('name','A friend')} has invited you to be their emergency contact on Lebo."}


# ---------------------------------------------------------------------------
# Emergency engine + escalation
# ---------------------------------------------------------------------------
def public_event(e: dict) -> dict:
    e = dict(e)
    e["id"] = e.pop("_id")
    e.pop("userId", None)
    e["createdAt"] = iso(e.get("createdAt"))
    e["cancelledAt"] = iso(e.get("cancelledAt"))
    for n in e.get("notifications", []):
        n["at"] = iso(n.get("at"))
    return e


async def _notify_contacts(user, event_id, lat, lng, share_location, alert_type="emergency"):
    """Simulate notifying contacts across channels and record delivery status."""
    field = "canReceiveEmergency" if alert_type == "emergency" else "canReceiveMissedCheckin"
    contacts = await db.emergency_contacts.find(
        {"userId": user["_id"], "deletedAt": None, field: True}).sort("priority", 1).to_list(50)
    notifications = []
    loc_txt = None
    if share_location and lat is not None and lng is not None:
        loc_txt = f"https://maps.google.com/?q={lat},{lng}"
    for c in contacts:
        notifications.append({
            "contactId": c["_id"], "contactName": c["name"], "channel": c.get("notifyMethod", "sms"),
            "status": "sent", "acknowledgement": None,
            "includedLocation": bool(loc_txt and c.get("canReceiveLocation", False)),
            "at": now_utc(),
        })
    return notifications, loc_txt


@api.post("/emergency/activate", status_code=201)
async def activate_emergency(body: EmergencyActivateIn, user=Depends(current_user)):
    eid = new_id()
    notifications, loc_txt = await _notify_contacts(user, eid, body.lat, body.lng, body.shareLocation)
    doc = {
        "_id": eid, "userId": user["_id"], "trigger": body.trigger, "status": "active",
        "lat": body.lat, "lng": body.lng, "locationLink": loc_txt, "shareLocation": body.shareLocation,
        "note": body.note, "notifications": notifications, "createdAt": now_utc(), "cancelledAt": None,
    }
    await db.emergency_events.insert_one(doc)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"safetyStatus": "emergency"}})
    await audit(user["_id"], "emergency.activate", {"trigger": body.trigger, "contacts": len(notifications)})
    return public_event(doc)


@api.get("/emergency")
async def list_events(user=Depends(current_user)):
    rows = await db.emergency_events.find({"userId": user["_id"]}).sort("createdAt", -1).to_list(100)
    return [public_event(e) for e in rows]


@api.get("/emergency/active")
async def active_event(user=Depends(current_user)):
    e = await db.emergency_events.find_one({"userId": user["_id"], "status": "active"})
    return public_event(e) if e else None


@api.get("/emergency/{eid}")
async def get_event(eid: str, user=Depends(current_user)):
    e = await db.emergency_events.find_one({"_id": eid, "userId": user["_id"]})
    if not e:
        raise HTTPException(404, "Event not found")
    return public_event(e)


@api.post("/emergency/{eid}/cancel")
async def cancel_event(eid: str, user=Depends(current_user)):
    e = await db.emergency_events.find_one_and_update(
        {"_id": eid, "userId": user["_id"], "status": "active"},
        {"$set": {"status": "cancelled", "cancelledAt": now_utc()}}, return_document=True)
    if not e:
        raise HTTPException(404, "Active event not found")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"safetyStatus": "safe"}})
    await audit(user["_id"], "emergency.cancel", {"eventId": eid})
    return public_event(e)


class AckIn(BaseModel):
    contactId: str
    response: Literal["contacting", "confirmed_safe", "cannot_reach"]


@api.post("/emergency/{eid}/acknowledge")
async def acknowledge_event(eid: str, body: AckIn, user=Depends(current_user)):
    e = await db.emergency_events.find_one({"_id": eid, "userId": user["_id"]})
    if not e:
        raise HTTPException(404, "Event not found")
    for n in e.get("notifications", []):
        if n["contactId"] == body.contactId:
            n["acknowledgement"] = body.response
    await db.emergency_events.update_one({"_id": eid}, {"$set": {"notifications": e["notifications"]}})
    return public_event(e)


# ---------------------------------------------------------------------------
# Safety Timers + Check-ins
# ---------------------------------------------------------------------------
def public_timer(t: dict) -> dict:
    t = dict(t)
    t["id"] = t.pop("_id")
    t.pop("userId", None)
    for k in ("createdAt", "nextCheckin", "endTime", "lastCheckin"):
        t[k] = iso(t.get(k))
    return t


@api.get("/safety-timers")
async def list_timers(user=Depends(current_user)):
    rows = await db.safety_timers.find({"userId": user["_id"], "status": "active"}).sort("createdAt", -1).to_list(50)
    return [public_timer(t) for t in rows]


@api.post("/safety-timers", status_code=201)
async def create_timer(body: TimerIn, user=Depends(current_user)):
    now = now_utc()
    doc = {"_id": new_id(), "userId": user["_id"], "status": "active",
           "intervalMinutes": body.intervalMinutes, "gracePeriodMinutes": body.gracePeriodMinutes,
           "label": body.label, "endTime": body.endTime,
           "nextCheckin": now + timedelta(minutes=body.intervalMinutes),
           "lastCheckin": now, "createdAt": now}
    await db.safety_timers.insert_one(doc)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"safetyStatus": "safe"}})
    await audit(user["_id"], "timer.create", {"interval": body.intervalMinutes})
    return public_timer(doc)


@api.delete("/safety-timers/{tid}", status_code=204)
async def stop_timer(tid: str, user=Depends(current_user)):
    res = await db.safety_timers.update_one(
        {"_id": tid, "userId": user["_id"], "status": "active"}, {"$set": {"status": "stopped"}})
    if res.matched_count == 0:
        raise HTTPException(404, "Timer not found")


@api.post("/checkins")
async def checkin(user=Depends(current_user)):
    """Explicit 'I'M SAFE' — resets all active timers."""
    now = now_utc()
    timers = await db.safety_timers.find({"userId": user["_id"], "status": "active"}).to_list(50)
    for t in timers:
        await db.safety_timers.update_one(
            {"_id": t["_id"]},
            {"$set": {"lastCheckin": now,
                      "nextCheckin": now + timedelta(minutes=t["intervalMinutes"])}})
    await db.safety_checkins.insert_one({"_id": new_id(), "userId": user["_id"], "at": now, "response": "safe"})
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"safetyStatus": "safe"}})
    await audit(user["_id"], "checkin.safe")
    return {"ok": True, "timers": [public_timer(t) for t in
            await db.safety_timers.find({"userId": user["_id"], "status": "active"}).to_list(50)]}


# ---------------------------------------------------------------------------
# Safe Journeys
# ---------------------------------------------------------------------------
def public_journey(j: dict) -> dict:
    j = dict(j)
    j["id"] = j.pop("_id")
    j.pop("userId", None)
    for k in ("createdAt", "expectedArrival", "completedAt"):
        j[k] = iso(j.get(k))
    return j


@api.get("/journeys")
async def list_journeys(user=Depends(current_user)):
    rows = await db.safe_journeys.find({"userId": user["_id"]}).sort("createdAt", -1).to_list(50)
    return [public_journey(j) for j in rows]


@api.post("/journeys", status_code=201)
async def create_journey(body: JourneyIn, user=Depends(current_user)):
    doc = {"_id": new_id(), "userId": user["_id"], "status": "active",
           "destination": body.destination, "expectedArrival": body.expectedArrival,
           "contactId": body.contactId, "checkinMinutes": body.checkinMinutes,
           "shareLocation": body.shareLocation, "createdAt": now_utc(), "completedAt": None}
    await db.safe_journeys.insert_one(doc)
    await audit(user["_id"], "journey.start", {"destination": body.destination})
    return public_journey(doc)


@api.post("/journeys/{jid}/complete")
async def complete_journey(jid: str, user=Depends(current_user)):
    j = await db.safe_journeys.find_one_and_update(
        {"_id": jid, "userId": user["_id"], "status": "active"},
        {"$set": {"status": "completed", "completedAt": now_utc()}}, return_document=True)
    if not j:
        raise HTTPException(404, "Journey not found")
    return public_journey(j)


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------
def public_mode(m: dict) -> dict:
    m = dict(m)
    m["id"] = m.pop("_id")
    m.pop("userId", None)
    m["createdAt"] = iso(m.get("createdAt"))
    return m


@api.get("/modes")
async def list_modes(user=Depends(current_user)):
    rows = await db.modes.find({"userId": user["_id"], "deletedAt": None}).sort("createdAt", 1).to_list(50)
    return [public_mode(m) for m in rows]


@api.post("/modes", status_code=201)
async def create_mode(body: ModeIn, user=Depends(current_user)):
    doc = {"_id": new_id(), "userId": user["_id"], "createdAt": now_utc(),
           "deletedAt": None, "active": False, **body.model_dump()}
    await db.modes.insert_one(doc)
    return public_mode(doc)


@api.put("/modes/{mid}")
async def update_mode(mid: str, body: ModeIn, user=Depends(current_user)):
    res = await db.modes.find_one_and_update(
        {"_id": mid, "userId": user["_id"], "deletedAt": None},
        {"$set": body.model_dump()}, return_document=True)
    if not res:
        raise HTTPException(404, "Mode not found")
    return public_mode(res)


@api.delete("/modes/{mid}", status_code=204)
async def delete_mode(mid: str, user=Depends(current_user)):
    await db.modes.update_one({"_id": mid, "userId": user["_id"]}, {"$set": {"deletedAt": now_utc()}})


@api.post("/modes/{mid}/activate")
async def activate_mode(mid: str, user=Depends(current_user)):
    m = await db.modes.find_one({"_id": mid, "userId": user["_id"], "deletedAt": None})
    if not m:
        raise HTTPException(404, "Mode not found")
    await db.modes.update_many({"userId": user["_id"]}, {"$set": {"active": False}})
    await db.modes.update_one({"_id": mid}, {"$set": {"active": True}})
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"currentMode": m["name"]}})
    return public_mode(await db.modes.find_one({"_id": mid}))


# ---------------------------------------------------------------------------
# Location shares
# ---------------------------------------------------------------------------
def public_share(s: dict) -> dict:
    s = dict(s)
    s["id"] = s.pop("_id")
    s.pop("userId", None)
    for k in ("createdAt", "expiresAt"):
        s[k] = iso(s.get(k))
    return s


@api.get("/location-shares")
async def list_shares(user=Depends(current_user)):
    now = now_utc()
    rows = await db.location_shares.find({"userId": user["_id"], "revoked": False}).to_list(100)
    out = []
    for s in rows:
        exp = s.get("expiresAt")
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp < now:
            continue
        out.append(public_share(s))
    return out


@api.post("/location-shares", status_code=201)
async def create_share(body: LocationShareIn, user=Depends(current_user)):
    contact = await db.emergency_contacts.find_one({"_id": body.contactId, "userId": user["_id"]})
    if not contact:
        raise HTTPException(404, "Contact not found")
    expires = None
    if body.mode in ("live", "until") and body.durationMinutes:
        expires = now_utc() + timedelta(minutes=body.durationMinutes)
    doc = {"_id": new_id(), "userId": user["_id"], "contactId": body.contactId,
           "contactName": contact["name"], "mode": body.mode, "lat": body.lat, "lng": body.lng,
           "revoked": False, "createdAt": now_utc(), "expiresAt": expires}
    await db.location_shares.insert_one(doc)
    await audit(user["_id"], "location.share", {"contactId": body.contactId, "mode": body.mode})
    return public_share(doc)


@api.delete("/location-shares/{sid}", status_code=204)
async def revoke_share(sid: str, user=Depends(current_user)):
    res = await db.location_shares.update_one(
        {"_id": sid, "userId": user["_id"]}, {"$set": {"revoked": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Share not found")


# ---------------------------------------------------------------------------
# Incident Journal (private)
# ---------------------------------------------------------------------------
def public_incident(i: dict) -> dict:
    i = dict(i)
    i["id"] = i.pop("_id")
    i.pop("userId", None)
    for k in ("createdAt", "occurredAt"):
        i[k] = iso(i.get(k))
    return i


@api.get("/incidents")
async def list_incidents(user=Depends(current_user)):
    rows = await db.incident_entries.find({"userId": user["_id"], "deletedAt": None}).sort("createdAt", -1).to_list(300)
    return [public_incident(i) for i in rows]


@api.post("/incidents", status_code=201)
async def create_incident(body: IncidentIn, user=Depends(current_user)):
    now = now_utc()
    occurred = body.occurredAt or iso(now)
    doc = {"_id": new_id(), "userId": user["_id"], "createdAt": now, "deletedAt": None,
           "category": body.category, "description": body.description, "location": body.location,
           "peopleInvolved": body.peopleInvolved, "occurredAt": occurred, "media": body.media}
    await db.incident_entries.insert_one(doc)
    await audit(user["_id"], "incident.create", {"category": body.category})
    return public_incident(doc)


@api.get("/incidents/{iid}")
async def get_incident(iid: str, user=Depends(current_user)):
    i = await db.incident_entries.find_one({"_id": iid, "userId": user["_id"], "deletedAt": None})
    if not i:
        raise HTTPException(404, "Incident not found")
    return public_incident(i)


@api.put("/incidents/{iid}")
async def update_incident(iid: str, body: IncidentIn, user=Depends(current_user)):
    res = await db.incident_entries.find_one_and_update(
        {"_id": iid, "userId": user["_id"], "deletedAt": None},
        {"$set": {"category": body.category, "description": body.description, "location": body.location,
                  "peopleInvolved": body.peopleInvolved, "media": body.media}}, return_document=True)
    if not res:
        raise HTTPException(404, "Incident not found")
    return public_incident(res)


@api.delete("/incidents/{iid}", status_code=204)
async def delete_incident(iid: str, user=Depends(current_user)):
    await db.incident_entries.update_one(
        {"_id": iid, "userId": user["_id"]}, {"$set": {"deletedAt": now_utc()}})


# ---------------------------------------------------------------------------
# Safety Plan
# ---------------------------------------------------------------------------
@api.get("/safety-plan")
async def get_safety_plan(user=Depends(current_user)):
    doc = await db.safety_plans.find_one({"userId": user["_id"]})
    return {"data": doc["data"] if doc else {}}


@api.put("/safety-plan")
async def save_safety_plan(body: SafetyPlanIn, user=Depends(current_user)):
    await db.safety_plans.update_one(
        {"userId": user["_id"]},
        {"$set": {"userId": user["_id"], "data": body.data, "updatedAt": now_utc()}}, upsert=True)
    return {"data": body.data}


# ---------------------------------------------------------------------------
# Support directory / Find Help Nearby
# ---------------------------------------------------------------------------
@api.get("/support")
async def support_directory(
    category: Optional[str] = None, q: Optional[str] = None,
    lat: Optional[float] = Query(None), lng: Optional[float] = Query(None),
    user=Depends(current_user)):
    query = {}
    if category and category != "all":
        query["category"] = category
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}},
                        {"city": {"$regex": q, "$options": "i"}}]
    rows = await db.support_organisations.find(query).to_list(500)
    out = []
    for r in rows:
        r = dict(r)
        r["id"] = r.pop("_id")
        if lat is not None and lng is not None and r.get("lat") is not None:
            r["distanceKm"] = round(haversine_km(lat, lng, r["lat"], r["lng"]), 1)
        else:
            r["distanceKm"] = None
        out.append(r)
    if lat is not None and lng is not None:
        out.sort(key=lambda x: (x["distanceKm"] is None, x["distanceKm"] or 0))
    return out


@api.get("/support/categories")
async def support_categories(user=Depends(current_user)):
    return SUPPORT_CATEGORIES


# ---------------------------------------------------------------------------
# Safety Chatbot (Claude Sonnet 4.6 via Emergent LLM key)
# ---------------------------------------------------------------------------
CHATBOT_SYSTEM = (
    "You are Lebo, a warm, calm personal-safety support assistant used in South Africa. "
    "You help people understand safety features, build a basic safety plan, find relevant support "
    "resources, prepare for difficult situations and navigate the Lebo app. "
    "CRITICAL RULES: If someone is in immediate danger, clearly and urgently direct them to use the "
    "app's red 'I NEED HELP' emergency button and to call emergency services (in South Africa: 10111 "
    "for police, 10177 for ambulance, or 112 from a mobile). "
    "Never claim to be a police officer, doctor, lawyer, therapist or emergency service. "
    "When appropriate, recommend professional help and real support organisations. "
    "Be concise, supportive, non-judgemental and practical. Use simple language."
)


@api.get("/chat/messages")
async def chat_history(sessionId: Optional[str] = None, user=Depends(current_user)):
    query = {"userId": user["_id"]}
    if sessionId:
        query["sessionId"] = sessionId
    rows = await db.chat_messages.find(query).sort("at", 1).to_list(500)
    return [{"id": r["_id"], "role": r["role"], "content": r["content"],
             "sessionId": r["sessionId"], "at": iso(r["at"])} for r in rows]


@api.post("/chat/message")
async def chat_message(body: ChatIn, user=Depends(current_user)):
    session_id = body.sessionId or new_id()
    now = now_utc()
    await db.chat_messages.insert_one({"_id": new_id(), "userId": user["_id"], "sessionId": session_id,
                                       "role": "user", "content": body.message, "at": now})
    history = await db.chat_messages.find(
        {"userId": user["_id"], "sessionId": session_id}).sort("at", 1).to_list(40)

    reply = None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id,
                       system_message=CHATBOT_SYSTEM).with_model("anthropic", "claude-sonnet-4-6")
        # Replay prior turns (excluding the just-added user message) for context.
        for m in history[:-1]:
            if m["role"] == "user":
                await chat.send_message(UserMessage(text=m["content"]))
        reply = await chat.send_message(UserMessage(text=body.message))
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        reply = ("I'm having trouble responding right now. If this is an emergency, use the red "
                 "'I NEED HELP' button or call 10111 (police) or 112 from your mobile.")

    await db.chat_messages.insert_one({"_id": new_id(), "userId": user["_id"], "sessionId": session_id,
                                       "role": "assistant", "content": reply, "at": now_utc()})
    return {"sessionId": session_id, "reply": reply}


# ---------------------------------------------------------------------------
# Account: data export & delete
# ---------------------------------------------------------------------------
@api.get("/account/export")
async def export_data(user=Depends(current_user)):
    uid = user["_id"]
    return {
        "profile": public_user(user),
        "contacts": [public_contact(c) for c in await db.emergency_contacts.find({"userId": uid, "deletedAt": None}).to_list(500)],
        "incidents": [public_incident(i) for i in await db.incident_entries.find({"userId": uid, "deletedAt": None}).to_list(500)],
        "emergencyEvents": [public_event(e) for e in await db.emergency_events.find({"userId": uid}).to_list(500)],
        "journeys": [public_journey(j) for j in await db.safe_journeys.find({"userId": uid}).to_list(500)],
        "exportedAt": iso(now_utc()),
    }


@api.delete("/account", status_code=204)
async def delete_account(user=Depends(current_user)):
    uid = user["_id"]
    ts = now_utc()
    await db.users.update_one({"_id": uid}, {"$set": {"deletedAt": ts, "email": f"deleted-{uid}@lebo.local"}})
    await db.sessions.update_many({"userId": uid}, {"$set": {"revokedAt": ts}})
    await audit(uid, "account.delete")


# ---------------------------------------------------------------------------
# Static: support categories + seed data (South Africa)
# ---------------------------------------------------------------------------
SUPPORT_CATEGORIES = [
    {"key": "police", "label": "Police", "icon": "ShieldStar"},
    {"key": "medical", "label": "Medical", "icon": "FirstAid"},
    {"key": "shelter", "label": "Shelters", "icon": "House"},
    {"key": "psychological", "label": "Psychological", "icon": "Brain"},
    {"key": "legal", "label": "Legal", "icon": "Scales"},
    {"key": "social", "label": "Social support", "icon": "UsersThree"},
]

SEED_ORGS = [
    {"name": "SAPS National Emergency", "category": "police", "phone": "10111", "city": "National",
     "address": "South African Police Service", "hours": "24/7", "emergency": True,
     "source": "SAPS", "verified": True, "lat": -26.2041, "lng": 28.0473, "website": "https://www.saps.gov.za"},
    {"name": "Ambulance / Emergency Medical", "category": "medical", "phone": "10177", "city": "National",
     "address": "National EMS", "hours": "24/7", "emergency": True,
     "source": "Dept of Health", "verified": True, "lat": -26.2041, "lng": 28.0473, "website": ""},
    {"name": "GBV Command Centre", "category": "social", "phone": "0800428428", "city": "National",
     "address": "Gender-Based Violence Command Centre", "hours": "24/7", "emergency": True,
     "source": "Dept of Social Development", "verified": True, "lat": -25.7479, "lng": 28.2293,
     "website": "https://gbv.org.za"},
    {"name": "Childline South Africa", "category": "social", "phone": "116", "city": "National",
     "address": "Childline SA", "hours": "24/7", "emergency": True,
     "source": "Childline SA", "verified": True, "lat": -29.8587, "lng": 31.0218, "website": "https://www.childlinesa.org.za"},
    {"name": "SADAG Mental Health Line", "category": "psychological", "phone": "0800567567", "city": "National",
     "address": "SA Depression & Anxiety Group", "hours": "24/7", "emergency": True,
     "source": "SADAG", "verified": True, "lat": -26.1076, "lng": 28.0567, "website": "https://www.sadag.org"},
    {"name": "Lifeline South Africa", "category": "psychological", "phone": "0861322322", "city": "National",
     "address": "Lifeline counselling", "hours": "24/7", "emergency": False,
     "source": "Lifeline SA", "verified": True, "lat": -26.1952, "lng": 28.0341, "website": "https://lifelinesa.co.za"},
    {"name": "POWA (People Opposing Women Abuse)", "category": "shelter", "phone": "0116426803", "city": "Johannesburg",
     "address": "Berea, Johannesburg", "hours": "Mon-Fri 08:00-16:30", "emergency": False,
     "source": "POWA", "verified": True, "lat": -26.1858, "lng": 28.0500, "website": "https://www.powa.co.za"},
    {"name": "Legal Aid South Africa", "category": "legal", "phone": "0800110110", "city": "National",
     "address": "Legal Aid SA", "hours": "Mon-Fri 07:00-19:00", "emergency": False,
     "source": "Legal Aid SA", "verified": True, "lat": -25.7461, "lng": 28.1881, "website": "https://legal-aid.co.za"},
    {"name": "Charlotte Maxeke Academic Hospital", "category": "medical", "phone": "0114884911", "city": "Johannesburg",
     "address": "Parktown, Johannesburg", "hours": "24/7", "emergency": True,
     "source": "Gauteng Health", "verified": True, "lat": -26.1766, "lng": 28.0451, "website": ""},
    {"name": "Hillbrow Police Station", "category": "police", "phone": "0114887000", "city": "Johannesburg",
     "address": "Hillbrow, Johannesburg", "hours": "24/7", "emergency": True,
     "source": "SAPS", "verified": True, "lat": -26.1875, "lng": 28.0489, "website": ""},
    {"name": "Frere Hospital", "category": "medical", "phone": "0437092000", "city": "East London",
     "address": "Amalinda, East London", "hours": "24/7", "emergency": True,
     "source": "EC Health", "verified": True, "lat": -32.9784, "lng": 27.8546, "website": ""},
    {"name": "Cape Town Central SAPS", "category": "police", "phone": "0214674600", "city": "Cape Town",
     "address": "Buitenkant St, Cape Town", "hours": "24/7", "emergency": True,
     "source": "SAPS", "verified": True, "lat": -33.9270, "lng": 18.4180, "website": ""},
    {"name": "Saartjie Baartman Centre", "category": "shelter", "phone": "0216337114", "city": "Cape Town",
     "address": "Manenberg, Cape Town", "hours": "24/7", "emergency": True,
     "source": "SBWC", "verified": True, "lat": -33.9887, "lng": 18.5450, "website": "https://saartjiebaartmancentre.org.za"},
    {"name": "TEARS Foundation (GBV)", "category": "social", "phone": "0800083277", "city": "National",
     "address": "TEARS GBV support", "hours": "24/7", "emergency": True,
     "source": "TEARS", "verified": True, "lat": -26.1070, "lng": 28.0560, "website": "https://tears.co.za"},
]


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True, sparse=True)
    await db.emergency_contacts.create_index("userId")
    await db.support_organisations.create_index("category")
    if await db.support_organisations.count_documents({}) == 0:
        docs = []
        for o in SEED_ORGS:
            docs.append({"_id": new_id(), "lastVerified": iso(now_utc()), **o})
        await db.support_organisations.insert_many(docs)
        logger.info(f"Seeded {len(docs)} support organisations")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
