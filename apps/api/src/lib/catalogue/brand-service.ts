import type { BrandDto } from "@eckamcreation/api-contracts";
import { writeAuditLog } from "@eckamcreation/auth";
import type { PrismaClient } from "@eckamcreation/database";
import { conflict, notFound } from "../errors";

export class BrandService {
  constructor(private readonly prisma: PrismaClient) {}

  async listPublic(): Promise<BrandDto[]> {
    const rows = await this.prisma.brand.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });
    return rows.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description,
      logoUrl: b.logoUrl,
      isActive: b.isActive,
    }));
  }

  async getPublicBySlugOrId(idOrSlug: string): Promise<BrandDto> {
    const brand = await this.prisma.brand.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });
    if (!brand) throw notFound("Brand not found");
    return {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      description: brand.description,
      logoUrl: brand.logoUrl,
      isActive: brand.isActive,
    };
  }

  async create(
    input: {
      slug: string;
      name: string;
      description?: string | null;
      logoUrl?: string | null;
      isActive?: boolean;
    },
    staffUserId: string,
  ) {
    const clash = await this.prisma.brand.findUnique({ where: { slug: input.slug } });
    if (clash && !clash.deletedAt) throw conflict("Brand slug already exists");

    const brand = await this.prisma.brand.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        logoUrl: input.logoUrl ?? null,
        isActive: input.isActive ?? true,
      },
    });

    await writeAuditLog(this.prisma, {
      action: "brand.created",
      entityType: "Brand",
      entityId: brand.id,
      staffUserId,
      metadata: { slug: brand.slug },
    });

    return brand;
  }

  async update(
    id: string,
    input: {
      slug?: string;
      name?: string;
      description?: string | null;
      logoUrl?: string | null;
      isActive?: boolean;
    },
    staffUserId: string,
  ) {
    const existing = await this.prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound("Brand not found");

    if (input.slug && input.slug !== existing.slug) {
      const clash = await this.prisma.brand.findUnique({ where: { slug: input.slug } });
      if (clash && clash.id !== id && !clash.deletedAt) throw conflict("Brand slug already exists");
    }

    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description === undefined ? undefined : input.description,
        logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
        isActive: input.isActive,
      },
    });

    await writeAuditLog(this.prisma, {
      action: "brand.updated",
      entityType: "Brand",
      entityId: id,
      staffUserId,
      metadata: { slug: brand.slug, isActive: brand.isActive },
    });

    return brand;
  }
}
