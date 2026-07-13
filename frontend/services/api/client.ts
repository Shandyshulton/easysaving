"use client";

import type { ApiResponse } from "@/types/api";
import type { User } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function getApiUrl() {
  if (typeof window === "undefined") return API_URL;

  const currentHost = window.location.hostname;
  const isLanAccess = currentHost !== "localhost" && currentHost !== "127.0.0.1";

  try {
    const url = new URL(API_URL);
    if (isLanAccess && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      url.hostname = currentHost;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return API_URL;
  }

  return API_URL;
}

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("easysaving_token") ?? "";
}

export function setToken(token: string) {
  localStorage.setItem("easysaving_token", token);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("easysaving_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User) {
  localStorage.setItem("easysaving_user", JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("easysaving:user-change", { detail: user }));
}

export function clearToken() {
  localStorage.removeItem("easysaving_token");
  localStorage.removeItem("easysaving_user");
}

export async function api<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? "Request failed");
  }
  return body.data;
}
