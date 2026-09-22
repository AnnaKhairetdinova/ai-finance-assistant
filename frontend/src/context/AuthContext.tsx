import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { login as loginRequest } from "../api/auth";
import { setUnauthorizedListener } from "../api/client";
import type { User } from "../types/auth";
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
} from "../utils/authStorage";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function clearAuthState() {
    clearAuthSession();
    setUser(null);
    setToken(null);
  }

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    } else {
      clearAuthSession();
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    setUnauthorizedListener(() => {
      setUser(null);
      setToken(null);
    });

    return () => setUnauthorizedListener(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      async login(email: string, password: string) {
        const result = await loginRequest(email, password);
        saveAuthSession(result.token, result.user);
        setToken(result.token);
        setUser(result.user);
      },
      logout() {
        clearAuthState();
        navigate("/login", { replace: true });
      },
    }),
    [isLoading, navigate, token, user],
  );

  return (
    <AuthContext.Provider value={value}>
      <Outlet />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
