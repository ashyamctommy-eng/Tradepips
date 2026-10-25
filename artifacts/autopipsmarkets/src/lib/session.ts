import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "autopipsmarkets_demo_token";

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

setAuthTokenGetter(readToken);

export function setTraderSession(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function hasTraderSession(): boolean {
  return Boolean(readToken());
}

export function clearTraderSession(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}
