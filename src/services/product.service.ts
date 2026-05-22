import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';

export const getProducts = async (params: { skip?: number; take?: number; search?: string }) => {
    const { skip = 0, take = 20, search } = params;

    const where: Prisma.ProductWhereInput = search
        ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ],
        }
        : {};

    const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
            skip,
            take,
            where,
            select: {
                id: true,
                shopifyHandle: true,
                name: true,
                nameEs: true,
                description: true,
                descriptionEs: true,
                priceCents: true,
                principalNotes: true,
                principalNotesEs: true,
                images: {
                    select: { url: true, altText: true, cloudinaryUrl: true, position: true },
                    orderBy: { position: 'asc' }
                },
                variants: {
                    select: {
                        id: true,
                        title: true,
                        priceCents: true,
                        compareAtPriceCents: true,
                        availableForSale: true,
                        sellableQuantity: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    return { total, products, skip, take };
};

const PRODUCT_SELECT = {
    id: true,
    shopifyHandle: true,
    name: true,
    nameEs: true,
    description: true,
    descriptionEs: true,
    priceCents: true,
    principalNotes: true,
    principalNotesEs: true,
    images: {
        select: { url: true, altText: true, cloudinaryUrl: true, position: true },
        orderBy: { position: 'asc' as const }
    },
    variants: {
        select: {
            id: true,
            title: true,
            priceCents: true,
            compareAtPriceCents: true,
            availableForSale: true,
            sellableQuantity: true,
        }
    }
} as const;

export const getProductById = async (id: number) => {
    return prisma.product.findUnique({
        where: { id },
        select: PRODUCT_SELECT
    });
};

export const getProductByHandle = async (handle: string) => {
    return prisma.product.findFirst({
        where: { shopifyHandle: handle },
        select: PRODUCT_SELECT
    });
};
