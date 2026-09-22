import { api } from "./client";
import type { LoginResponse, RegisterResponse } from "../types/auth";

export function register(email: string, password: string) {
  return api.post<RegisterResponse>(
    "/api/auth/register",
    { email, password },
    { auth: false },
  );
}

export function login(email: string, password: string) {
  return api.post<LoginResponse>(
    "/api/auth/login",
    { email, password },
    { auth: false },
  );
}
