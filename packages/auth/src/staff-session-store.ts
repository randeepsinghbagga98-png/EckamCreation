import type { PrismaClient } from "@eckamcreation/database";

/**
 * Staff sessions are stored separately from customer Auth.js Session rows.
 * Production uses PrismaStaffSessionStore (durable, multi-instance safe).
 * MemoryStaffSessionStore remains available for unit tests.
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

export class PrismaStaffSessionStore implements StaffSessionStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: StaffSessionRecord): Promise<void> {
    await this.prisma.staffSession.create({
      data: {
        sessionToken: record.token,
        staffUserId: record.staffUserId,
        expires: record.expiresAt,
      },
    });
  }

  async get(token: string): Promise<StaffSessionRecord | null> {
    const row = await this.prisma.staffSession.findUnique({
      where: { sessionToken: token },
    });
    if (!row) return null;
    if (row.expires.getTime() <= Date.now()) {
      await this.prisma.staffSession.delete({ where: { id: row.id } }).catch(() => undefined);
      return null;
    }
    return {
      token: row.sessionToken,
      staffUserId: row.staffUserId,
      expiresAt: row.expires,
    };
  }

  async delete(token: string): Promise<void> {
    await this.prisma.staffSession.deleteMany({ where: { sessionToken: token } });
  }

  async deleteAllForStaff(staffUserId: string): Promise<void> {
    await this.prisma.staffSession.deleteMany({ where: { staffUserId } });
  }
}

const globalStore = globalThis as unknown as {
  __eckamStaffSessions?: MemoryStaffSessionStore;
};

/** @deprecated Prefer PrismaStaffSessionStore in API runtime. Kept for tests. */
export function getDefaultStaffSessionStore(): MemoryStaffSessionStore {
  if (!globalStore.__eckamStaffSessions) {
    globalStore.__eckamStaffSessions = new MemoryStaffSessionStore();
  }
  return globalStore.__eckamStaffSessions;
}
