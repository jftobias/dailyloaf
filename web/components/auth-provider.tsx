"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type User,
} from "@/lib/api-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  error: ApiError | null;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { email: string; password: string; household_name: string; currency_code: string }) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus(currentUser ? "authenticated" : "unauthenticated");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(requestError instanceof ApiError ? requestError : new ApiError(0, "network_error", "The API is unavailable."));
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    error,
    async login(email, password) {
      const authenticatedUser = await loginRequest({ email, password });
      setUser(authenticatedUser);
      setError(null);
      setStatus("authenticated");
      return authenticatedUser;
    },
    async register(input) {
      const result = await registerRequest(input);
      setUser(result.user);
      setError(null);
      setStatus("authenticated");
      return result.user;
    },
    async logout() {
      await logoutRequest();
      setUser(null);
      setError(null);
      setStatus("unauthenticated");
    },
  }), [error, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
