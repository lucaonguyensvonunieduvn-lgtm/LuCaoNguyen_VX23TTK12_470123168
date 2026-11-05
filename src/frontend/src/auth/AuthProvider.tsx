import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiJson, clearToken, getToken, setToken } from "../api/client";

export type Session = {
  token?: string;
  email: string;
  fullName: string;
  roles: string[];
};

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<Session>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }

    apiJson<Session>("/api/auth/me")
      .then((user) => setSession({ ...user, token }))
      .catch(() => clearToken())
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    ready,
    async login(email, password, remember = true) {
      const next = await apiJson<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (next.token) setToken(next.token, remember);
      setSession(next);
      return next;
    },
    async register(fullName, email, password) {
      const next = await apiJson<Session>("/api/auth/register", { method: "POST", body: JSON.stringify({ fullName, email, password }) });
      if (next.token) setToken(next.token);
      setSession(next);
    },
    logout() {
      clearToken();
      setSession(null);
    },
  }), [ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}
