export const AUTH_COOKIE = "pt-admin-session";

export function hasSessionCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim() === `${AUTH_COOKIE}=1`);
}

export function setSessionCookie() {
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSessionCookie() {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}
