import { createHash } from "node:crypto";

export const OPS_AUTH_COOKIE = "ops_auth";

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, segment) => {
      const index = segment.indexOf("=");
      if (index <= 0) return acc;
      const key = segment.slice(0, index);
      const value = segment.slice(index + 1);
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

export function getOpsPassword() {
  return process.env.OPS_ADMIN_PASSWORD ?? "reclaim-admin";
}

export function createOpsSessionToken(password: string) {
  return createHash("sha256").update(`ops:${password}`).digest("hex");
}

export function isOpsPasswordValid(password: string) {
  return password === getOpsPassword();
}

export function isOpsRequestAuthorized(request: Request) {
  if (process.env.NODE_ENV === "test") return true;
  const token = parseCookieHeader(request.headers.get("cookie"))[OPS_AUTH_COOKIE];
  if (!token) return false;
  const expected = createOpsSessionToken(getOpsPassword());
  return token === expected;
}

