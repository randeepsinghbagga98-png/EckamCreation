import type { CategoryDto } from "@eckamcreation/api-contracts";
import { writeAuditLog } from "@eckamcreation/auth";
import type { PrismaClient } from "@eckamcreation/database";
import { conflict, notFound, validationError } from "../errors";
import { slugifyPath } from "./helpers";

export class CategoryService {
  constructor(private readonly prisma: PrismaClient) {}

  async listPublic(): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { children: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      parentId: c.parentId,
      path: c.path,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      childrenCount: c._count.children,
    }));
  }

  async listAdmin(): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { children: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      parentId: c.parentId,
      path: c.path,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      childrenCount: c._count.children,
    }));
  }

  async getPublicBySlugOrId(idOrSlug: string): Promise<CategoryDto & { children: CategoryDto[] }> {
    const category = await this.prisma.category.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        children: {
          where: { deletedAt: null, isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
    if (!category) throw notFound("Category not found");
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      path: category.path,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      children: category.children.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        parentId: c.parentId,
        path: c.path,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      })),
    };
  }

  async create(
    input: {
      slug: string;
      name: string;
      description?: string | null;
      parentId?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    staffUserId: string,
  ) {
    const clash = await this.prisma.category.findUnique({ where: { slug: input.slug } });
    if (clash && !clash.deletedAt) throw conflict("Category slug already exists");

    let parentPath: string | null = null;
    if (input.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: input.parentId, deletedAt: null },
      });
      if (!parent) throw validationError("Invalid parentId");
      parentPath = parent.path ?? `/${parent.slug}`;
    }

    const category = await this.prisma.category.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        path: slugifyPath(parentPath, input.slug),
      },
    });

    await writeAuditLog(this.prisma, {
      action: "category.created",
      entityType: "Category",
      entityId: category.id,
      staffUserId,
      metadata: { slug: category.slug },
    });

    return category;
  }

  async update(
    id: string,
    input: {
      slug?: string;
      name?: string;
      description?: string | null;
      parentId?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    staffUserId: string,
  ) {
    const existing = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound("Category not found");

    if (input.parentId === id) throw validationError("Category cannot be its own parent");
    if (input.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: input.parentId, deletedAt: null },
      });
      if (!parent) throw validationError("Invalid parentId");
      if (parent.path?.includes(`/${existing.slug}/`) || parent.path?.endsWith(`/${existing.slug}`)) {
        throw validationError("Invalid category hierarchy");
      }
    }

    if (input.slug && input.slug !== existing.slug) {
      const clash = await this.prisma.category.findUnique({ where: { slug: input.slug } });
      if (clash && clash.id !== id && !clash.deletedAt) throw conflict("Category slug already exists");
    }

    let path = existing.path;
    if (input.slug || input.parentId !== undefined) {
      let parentPath: string | null = null;
      const parentId = input.parentId !== undefined ? input.parentId : existing.parentId;
      if (parentId) {
        const parent = await this.prisma.category.findFirst({ where: { id: parentId, deletedAt: null } });
        parentPath = parent?.path ?? (parent ? `/${parent.slug}` : null);
      }
      path = slugifyPath(parentPath, input.slug ?? existing.slug);
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description === undefined ? undefined : input.description,
        parentId: input.parentId === undefined ? undefined : input.parentId,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        path,
      },
    });

    await writeAuditLog(this.prisma, {
      action: "category.updated",
      entityType: "Category",
      entityId: id,
      staffUserId,
      metadata: { slug: category.slug, isActive: category.isActive },
    });

    return category;
  }
}
