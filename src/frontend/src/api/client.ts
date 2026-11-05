export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5189";

export type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const tokenKey = "laptop-store-token";

export function getToken() {
  return sessionStorage.getItem(tokenKey) ?? localStorage.getItem(tokenKey);
}

export function setToken(token: string, remember = true) {
  if (remember) {
    localStorage.setItem(tokenKey, token);
    sessionStorage.removeItem(tokenKey);
    return;
  }
  sessionStorage.setItem(tokenKey, token);
  localStorage.removeItem(tokenKey);
}

export function clearToken() {
  localStorage.removeItem(tokenKey);
  sessionStorage.removeItem(tokenKey);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    throw await toApiError(response);
  }

  return response;
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  const response = await apiFetch(path, init);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function toApiError(response: Response) {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = {};
  }

  return new ApiError(response.status, body.message ?? "The request could not be completed.", body.errors);
}
