import type { CollectionDto } from "@eckamcreation/api-contracts";
import { writeAuditLog } from "@eckamcreation/auth";
import type { PrismaClient } from "@eckamcreation/database";
import { conflict, notFound, validationError } from "../errors";

function isCollectionLive(c: {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  deletedAt: Date | null;
}): boolean {
  if (c.deletedAt || !c.isActive) return false;
  const now = Date.now();
  if (c.startsAt && c.startsAt.getTime() > now) return false;
  if (c.endsAt && c.endsAt.getTime() < now) return false;
  return true;
}

export class CollectionService {
  constructor(private readonly prisma: PrismaClient) {}

  async listPublic(): Promise<CollectionDto[]> {
    const rows = await this.prisma.collection.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return rows.filter(isCollectionLive).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      productCount: c._count.products,
    }));
  }

  async getPublicBySlugOrId(idOrSlug: string): Promise<CollectionDto & { productIds: string[] }> {
    const collection = await this.prisma.collection.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: { product: { select: { id: true, status: true, deletedAt: true } } },
        },
      },
    });
    if (!collection || !isCollectionLive(collection)) throw notFound("Collection not found");

    const productIds = collection.products
      .filter((p) => p.product.deletedAt == null && p.product.status === "ACTIVE")
      .map((p) => p.productId);

    return {
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      isActive: collection.isActive,
      startsAt: collection.startsAt?.toISOString() ?? null,
      endsAt: collection.endsAt?.toISOString() ?? null,
      productCount: productIds.length,
      productIds,
    };
  }

  async create(
    input: {
      slug: string;
      name: string;
      description?: string | null;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
      productIds?: string[];
    },
    staffUserId: string,
  ) {
    const clash = await this.prisma.collection.findUnique({ where: { slug: input.slug } });
    if (clash && !clash.deletedAt) throw conflict("Collection slug already exists");

    const collection = await this.prisma.collection.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        products: input.productIds?.length
          ? {
              create: input.productIds.map((productId, index) => ({
                productId,
                position: index,
              })),
            }
          : undefined,
      },
    });

    await writeAuditLog(this.prisma, {
      action: "collection.created",
      entityType: "Collection",
      entityId: collection.id,
      staffUserId,
      metadata: { slug: collection.slug },
    });

    return collection;
  }

  async update(
    id: string,
    input: {
      slug?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
      productIds?: string[];
    },
    staffUserId: string,
  ) {
    const existing = await this.prisma.collection.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound("Collection not found");

    if (input.slug && input.slug !== existing.slug) {
      const clash = await this.prisma.collection.findUnique({ where: { slug: input.slug } });
      if (clash && clash.id !== id && !clash.deletedAt) throw conflict("Collection slug already exists");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.collection.update({
        where: { id },
        data: {
          slug: input.slug,
          name: input.name,
          description: input.description === undefined ? undefined : input.description,
          isActive: input.isActive,
          startsAt:
            input.startsAt === undefined ? undefined : input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null,
        },
      });

      if (input.productIds) {
        await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
        if (input.productIds.length) {
          const products = await tx.product.findMany({
            where: { id: { in: input.productIds }, deletedAt: null },
            select: { id: true },
          });
          if (products.length !== input.productIds.length) {
            throw validationError("One or more productIds are invalid");
          }
          await tx.collectionProduct.createMany({
            data: input.productIds.map((productId, index) => ({
              collectionId: id,
              productId,
              position: index,
            })),
          });
        }
      }
    });

    await writeAuditLog(this.prisma, {
      action: "collection.updated",
      entityType: "Collection",
      entityId: id,
      staffUserId,
      metadata: { slug: input.slug ?? existing.slug, isActive: input.isActive ?? existing.isActive },
    });

    return this.prisma.collection.findUniqueOrThrow({ where: { id } });
  }

  async addProducts(id: string, productIds: string[], staffUserId: string) {
    const collection = await this.prisma.collection.findFirst({ where: { id, deletedAt: null } });
    if (!collection) throw notFound("Collection not found");

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
      select: { id: true },
    });
    if (products.length !== productIds.length) throw validationError("One or more productIds are invalid");

    const maxPos = await this.prisma.collectionProduct.aggregate({
      where: { collectionId: id },
      _max: { position: true },
    });
    let position = (maxPos._max.position ?? -1) + 1;

    for (const productId of productIds) {
      await this.prisma.collectionProduct.upsert({
        where: { collectionId_productId: { collectionId: id, productId } },
        create: { collectionId: id, productId, position: position++ },
        update: {},
      });
    }

    await writeAuditLog(this.prisma, {
      action: "collection.products_added",
      entityType: "Collection",
      entityId: id,
      staffUserId,
      metadata: { productIds },
    });
  }

  async removeProduct(id: string, productId: string, staffUserId: string) {
    const collection = await this.prisma.collection.findFirst({ where: { id, deletedAt: null } });
    if (!collection) throw notFound("Collection not found");

    const existing = await this.prisma.collectionProduct.findUnique({
      where: { collectionId_productId: { collectionId: id, productId } },
    });
    if (!existing) throw notFound("Product is not in this collection");

    await this.prisma.collectionProduct.delete({
      where: { collectionId_productId: { collectionId: id, productId } },
    });

    await writeAuditLog(this.prisma, {
      action: "collection.product_removed",
      entityType: "Collection",
      entityId: id,
      staffUserId,
      metadata: { productId },
    });
  }
}
