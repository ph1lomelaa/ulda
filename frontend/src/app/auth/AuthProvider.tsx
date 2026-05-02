import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  register as registerRequest,
  type AuthUser,
} from "../api/auth";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const ACCESS_TOKEN_STORAGE_KEY = "ulda_access_token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function storeAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

function clearAuthState(
  setAccessToken: (token: string | null) => void,
  setUser: (user: AuthUser | null) => void,
) {
  setAccessToken(null);
  setUser(null);
  storeAccessToken(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      try {
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

        if (token) {
          try {
            const currentUser = await getCurrentUser(token);
            if (!cancelled) {
              setAccessToken(token);
              setUser(currentUser);
            }
            return;
          } catch {
            const refreshed = await refreshSession();
            if (!cancelled) {
              setAccessToken(refreshed.access_token);
              setUser(refreshed.user);
              storeAccessToken(refreshed.access_token);
            }
          }
        } else {
          const refreshed = await refreshSession();
          if (!cancelled) {
            setAccessToken(refreshed.access_token);
            setUser(refreshed.user);
            storeAccessToken(refreshed.access_token);
          }
        }
      } catch {
        if (!cancelled) {
          clearAuthState(setAccessToken, setUser);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAuthSuccess(payload: { access_token: string; user: AuthUser }) {
    setAccessToken(payload.access_token);
    setUser(payload.user);
    storeAccessToken(payload.access_token);
  }

  async function login(payload: { email: string; password: string }) {
    const response = await loginRequest(payload);
    await handleAuthSuccess(response);
  }

  async function register(payload: { email: string; password: string; name: string }) {
    const response = await registerRequest(payload);
    await handleAuthSuccess(response);
  }

  async function logout() {
    await logoutRequest();
    clearAuthState(setAccessToken, setUser);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      login,
      register,
      logout,
    }),
    [user, accessToken, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
