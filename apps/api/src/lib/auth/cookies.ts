export const CUSTOMER_SESSION_COOKIE = "eckam_session";
export const STAFF_SESSION_COOKIE = "eckam_staff_session";

export type SessionCookieOptions = {
  expires: Date;
};

export function sessionCookieOptions(expires: Date) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}
