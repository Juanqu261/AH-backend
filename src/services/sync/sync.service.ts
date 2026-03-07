import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { logger } from '@/utils/logger';
import { ShopifyProduct } from '@/services/shopify/shopify.types';
import { shopifyClient } from '@/services/shopify/shopify.service';
import { PrismaClient } from '@/.prisma/client';

/**
 * Servicio de sincronización Shopify → Base de datos
 * - Obtener productos de Shopify vía GraphQL
 * - Transformar datos (precios, imágenes, variantes)
 * - Guardar/actualizar en PostgreSQL vía Prisma
 */


const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date;
  duration: number; // ms
}

/**
 * Convierte string de precio Shopify ("19.99") a cents (1999)
 * Esto evita problemas de redondeo en decimales
 */
function priceStringToCents(priceStr: string | null): number | null {
  if (!priceStr) return null;

  const priceNum = parseFloat(priceStr);
  if (isNaN(priceNum)) return null;

  // Multiplicar por 100 y redondear para evitar errores de precisión
  return Math.round(priceNum * 100);
}

/**
 * Extrae el ID numérico del ID de Shopify
 * Ej: "gid://shopify/Product/123456" → "gid://shopify/Product/123456"
 * (en realidad guardamos toda la ID para sincronización idempotente)
 */
function extractShopifyId(shopifyGid: string): string {
  return shopifyGid;
}

export class SyncService {
  /**
   * Sincroniza todos los productos desde Shopify
   * Maneja paginación automáticamente
   */
  async syncAllProducts(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 0,
    };

    try {
      logger.info('Starting full product sync from Shopify...');

      let cursor: string | undefined;
      let hasNextPage = true;
      const pageSize = 250;
      let pageNum = 0;

      while (hasNextPage) {
        pageNum++;
        try {
          logger.info(`Fetching page ${pageNum} (cursor: ${cursor ? cursor.substring(0, 10) + '...' : 'start'})`);

          const response = await shopifyClient.getProducts(pageSize, cursor);
          const products = response.products.edges.map((edge) => edge.node);

          logger.info(`Retrieved ${products.length} products from Shopify`);

          // Procesar cada producto
          for (const product of products) {
            try {
              const wasCreated = await this.processProduct(product);

              if (wasCreated) {
                result.created++;
              } else {
                result.updated++;
              }
              result.totalProcessed++;
            } catch (error) {
              result.failed++;
              const errorMsg = error instanceof Error
                ? error.message
                : String(error);
              result.errors.push(`Product ${product.id}: ${errorMsg}`);
              logger.error(`Failed to process product ${product.id}`, { error: errorMsg });
            }
          }

          // Manejar paginación
          hasNextPage = response.products.pageInfo.hasNextPage;
          cursor = response.products.pageInfo.endCursor || undefined;

          logger.info(
            `Page ${pageNum} complete. Has next page: ${hasNextPage}`,
          );
        } catch (error) {
          result.success = false;
          const errorMsg = error instanceof Error
            ? error.message
            : String(error);
          result.errors.push(`Pagination error: ${errorMsg}`);
          logger.error('Pagination error during sync', { error: errorMsg });
          break;
        }
      }

      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      logger.info(`===== SYNC COMPLETED =====`, {
        status: result.success ? 'SUCCESS' : 'PARTIAL',
        totalProcessed: result.totalProcessed,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        duration: `${result.duration}ms (${(result.duration / 1000).toFixed(1)}s)`,
      });

      return result;
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error
        ? error.message
        : String(error);
      result.errors.push(`Sync error: ${errorMsg}`);
      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      logger.error('CRITICAL SYNC ERROR', { error: errorMsg });
      return result;
    }
  }

  /**
   * Sincroniza productos modificados desde una fecha
   * Más eficiente que syncAllProducts (delta sync)
   */
  async syncProductsSince(since: Date): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 0,
    };

    try {
      logger.info(`Starting delta sync since ${since.toISOString()}`);

      let cursor: string | undefined;
      let hasNextPage = true;
      const pageSize = 250;

      while (hasNextPage) {
        try {
          logger.info(`Fetching modified products (cursor: ${cursor ? cursor.substring(0, 10) + '...' : 'start'})`);

          const response = await shopifyClient.getProductsModifiedSince(
            since,
            pageSize,
            cursor,
          );
          const products = response.products.edges.map((edge) => edge.node);

          logger.info(`Retrieved ${products.length} modified products`);

          for (const product of products) {
            try {
              await this.processProduct(product);
              result.updated++;
              result.totalProcessed++;
            } catch (error) {
              result.failed++;
              const errorMsg = error instanceof Error
                ? error.message
                : String(error);
              result.errors.push(`Product ${product.id}: ${errorMsg}`);
              logger.error(`Failed to process modified product`, { error: errorMsg });
            }
          }

          hasNextPage = response.products.pageInfo.hasNextPage;
          cursor = response.products.pageInfo.endCursor || undefined;

          logger.info(
            `Batch complete. Has next page: ${hasNextPage}`,
          );
        } catch (error) {
          result.success = false;
          const errorMsg = error instanceof Error
            ? error.message
            : String(error);
          result.errors.push(`Pagination error: ${errorMsg}`);
          logger.error('Pagination error during delta sync', { error: errorMsg });
          break;
        }
      }

      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      logger.info(`===== DELTA SYNC COMPLETED =====`, {
        status: result.success ? 'SUCCESS' : 'PARTIAL',
        totalProcessed: result.totalProcessed,
        updated: result.updated,
        failed: result.failed,
        duration: `${result.duration}ms (${(result.duration / 1000).toFixed(1)}s)`,
      });

      return result;
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error
        ? error.message
        : String(error);
      result.errors.push(`Sync error: ${errorMsg}`);
      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      logger.error('CRITICAL DELTA SYNC ERROR', { error: errorMsg });
      return result;
    }
  }

  /**
   * Procesa un producto individual de Shopify
   * - Crea o actualiza el Product
   * - Crea o actualiza sus ProductVariants
   * - Sincroniza ProductImages
   * @returns true si fue CREADO, false si fue ACTUALIZADO
   */
  private async processProduct(
    product: ShopifyProduct,
  ): Promise<boolean> {
    logger.debug(`Processing product: ${product.title}`, {
      shopifyId: product.id,
      handle: product.handle,
      variants: product.variants.edges.length,
      images: product.images.edges.length,
    });

    // Validar datos mínimos
    if (!product.id || !product.title) {
      throw new Error('Invalid product: missing id or title');
    }

    if (product.variants.edges.length === 0) {
      throw new Error(`Invalid product: no variants for ${product.title}`);
    }

    const shopifyId = extractShopifyId(product.id);
    const firstVariantPrice = priceStringToCents(product.variants.edges[0]?.node?.price || null);

    try {
      // 1. Crear O actualizar Product
      let wasCreated = false;
      const dbProduct = await prisma.product.upsert({
        where: { shopifyId },
        update: {
          name: product.title,
          description: product.description,
          shopifyHandle: product.handle,
          priceCents: firstVariantPrice,
          lastSyncedAt: new Date(),
        },
        create: {
          shopifyId,
          shopifyHandle: product.handle,
          name: product.title,
          description: product.description,
          priceCents: firstVariantPrice,
          lastSyncedAt: new Date(),
        },
      });

      wasCreated = !dbProduct.lastSyncedAt ||
        (new Date(dbProduct.updatedAt).getTime() === new Date().getTime());

      // 2. Procesar variantes
      for (const variantEdge of product.variants.edges) {
        const variant = variantEdge.node;

        if (!variant.id) {
          logger.warn(`Skipping variant: missing id`, {
            productTitle: product.title,
          });
          continue;
        }

        const variantShopifyId = extractShopifyId(variant.id);
        const priceCents = priceStringToCents(variant.price);
        const compareAtPriceCents = priceStringToCents(variant.compareAtPrice);

        if (priceCents === null) {
          throw new Error(`Invalid price for variant ${variant.id}: ${variant.price}`);
        }

        // Upsert variant
        await prisma.productVariant.upsert({
          where: { shopifyId: variantShopifyId },
          update: {
            title: variant.title,
            sku: variant.sku,
            priceCents,
            compareAtPriceCents,
            availableForSale: variant.availableForSale,
            sellableQuantity: variant.sellableOnlineQuantity,
          },
          create: {
            productId: dbProduct.id,
            shopifyId: variantShopifyId,
            title: variant.title,
            sku: variant.sku,
            priceCents,
            compareAtPriceCents,
            availableForSale: variant.availableForSale,
            sellableQuantity: variant.sellableOnlineQuantity,
          },
        });
      }

      // 3. Procesar imágenes
      if (product.images.edges.length > 0) {
        for (let idx = 0; idx < product.images.edges.length; idx++) {
          const imageEdge = product.images.edges[idx];
          const image = imageEdge.node;

          if (!image.url) {
            logger.warn(`Skipping image: missing url`, {
              productTitle: product.title,
            });
            continue;
          }

          const imageShopifyId = extractShopifyId(image.id);

          await prisma.productImage.upsert({
            where: { shopifyId: imageShopifyId },
            update: {
              url: image.url,
              altText: image.altText,
              position: idx,
            },
            create: {
              shopifyId: imageShopifyId,
              productId: dbProduct.id,
              url: image.url,
              altText: image.altText,
              position: idx,
            },
          });
        }
      }

      logger.debug(`Product processed: ${product.title}`, {
        action: wasCreated ? 'CREATED' : 'UPDATED',
        variants: product.variants.edges.length,
      });

      return wasCreated;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing product ${product.title}`, { error: errorMsg });
      throw error;
    }
  }
}

export const syncService = new SyncService();
