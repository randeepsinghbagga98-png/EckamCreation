import { adminData } from "@/lib/api/client";

export type StaffSession = {
  kind: "staff";
  staffUserId: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
};

export type StaffSessionResponse =
  | { authenticated: true; session: StaffSession }
  | { authenticated: false; session: null };

export async function fetchStaffSession(): Promise<StaffSession | null> {
  const result = await adminData<StaffSessionResponse>("/v1/auth/staff/session");
  return result.authenticated ? result.session : null;
}

export async function staffLogin(email: string, password: string): Promise<StaffSession> {
  return adminData<StaffSession>("/v1/auth/staff/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function staffLogout(): Promise<void> {
  await adminData("/v1/auth/staff/logout", { method: "POST" });
}
