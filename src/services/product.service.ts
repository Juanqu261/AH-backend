import { prisma } from '@/config/db';
import { Prisma } from '@/.prisma/client';

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
            include: {
                images: {
                    orderBy: { position: 'asc' }
                },
                variants: true
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    return { total, products, skip, take };
};

export const getProductById = async (id: number) => {
    return prisma.product.findUnique({
        where: { id },
        include: {
            images: {
                orderBy: { position: 'asc' }
            },
            variants: true
        }
    });
};

export const getProductByHandle = async (handle: string) => {
    return prisma.product.findFirst({
        where: { shopifyHandle: handle },
        include: {
            images: {
                orderBy: { position: 'asc' }
            },
            variants: true
        }
    });
};
