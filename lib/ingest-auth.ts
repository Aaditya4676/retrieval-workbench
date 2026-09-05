import { timingSafeEqual } from "node:crypto";

export function authorizedIngest(
  authorization: string | undefined,
  token: string | undefined,
) {
  if (!token || !authorization?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(token);
  const actual = Buffer.from(authorization.slice(7));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
