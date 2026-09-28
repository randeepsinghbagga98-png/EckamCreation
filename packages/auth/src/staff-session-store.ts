/**
 * Staff sessions are not modeled in Prisma Phase 1 (Session is Auth.js/User-only).
 * Phase 3.2 uses a replaceable in-memory store for single-instance local/dev.
 * Production multi-instance deployments need a StaffSession table (or Redis) later.
 */

export type StaffSessionRecord = {
  token: string;
  staffUserId: string;
  expiresAt: Date;
};

export interface StaffSessionStore {
  create(record: StaffSessionRecord): Promise<void>;
  get(token: string): Promise<StaffSessionRecord | null>;
  delete(token: string): Promise<void>;
  deleteAllForStaff(staffUserId: string): Promise<void>;
}

export class MemoryStaffSessionStore implements StaffSessionStore {
  private readonly sessions = new Map<string, StaffSessionRecord>();

  async create(record: StaffSessionRecord): Promise<void> {
    this.sessions.set(record.token, record);
  }

  async get(token: string): Promise<StaffSessionRecord | null> {
    const record = this.sessions.get(token);
    if (!record) return null;
    if (record.expiresAt.getTime() <= Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    return record;
  }

  async delete(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async deleteAllForStaff(staffUserId: string): Promise<void> {
    for (const [token, record] of this.sessions) {
      if (record.staffUserId === staffUserId) this.sessions.delete(token);
    }
  }

  /** Test helper */
  clear(): void {
    this.sessions.clear();
  }
}

const globalStore = globalThis as unknown as {
  __eckamStaffSessions?: MemoryStaffSessionStore;
};

export function getDefaultStaffSessionStore(): MemoryStaffSessionStore {
  if (!globalStore.__eckamStaffSessions) {
    globalStore.__eckamStaffSessions = new MemoryStaffSessionStore();
  }
  return globalStore.__eckamStaffSessions;
}
