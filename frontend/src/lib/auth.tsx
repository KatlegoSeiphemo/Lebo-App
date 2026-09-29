import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken } from "@/src/lib/api";

export type AppLock = {
  enabled: boolean;
  method: "biometric" | "pin" | "none";
  timeout: "immediate" | "1min" | "5min";
  hasPin: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  safetyStatus: string;
  currentMode: string;
  locationSharingDefault: string;
  analyticsOptIn: boolean;
  appLock: AppLock;
  onboarded: boolean;
  createdAt: string | null;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  locked: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
  unlock: () => void;
};

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      const me = await api.get<User>("/me");
      setUserState(me);
      setLocked(!!me.appLock?.enabled);
    } catch {
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    await setToken(res.token);
    setUserState(res.user);
    setLocked(!!res.user.appLock?.enabled);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>("/auth/register", { name, email, password });
    await setToken(res.token);
    setUserState(res.user);
    setLocked(false);
  };

  const signOut = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    await setToken(null);
    setUserState(null);
    setLocked(false);
  };

  const refreshUser = async () => {
    try {
      const me = await api.get<User>("/me");
      setUserState(me);
    } catch {}
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        locked,
        signIn,
        signUp,
        signOut,
        refreshUser,
        setUser: setUserState,
        unlock: () => setLocked(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
