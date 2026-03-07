/**
 * Script de exploración del schema GraphQL de Shopify
 * Ayuda a descubrir qué campos están disponibles para productos y variantes
 * Ejecuta con: npx ts-node -r tsconfig-paths/register src/jobs/explore-shopify-schema.ts
 */

import 'dotenv/config';
import { shopifyClient } from '@/services/shopify/shopify.service';
import { logger } from '@/utils/logger';

const introspectionQuery = `
  query {
    __type(name: "ProductVariant") {
      name
      fields {
        name
        type {
          name
          kind
        }
        isDeprecated
        deprecationReason
      }
    }
  }
`;

const productImageQuery = `
  query {
    __type(name: "Image") {
      name
      fields {
        name
        type {
          name
          kind
        }
        isDeprecated
        deprecationReason
      }
    }
  }
`;

async function exploreSchema() {
  try {
    logger.info('Exploring Shopify GraphQL Schema...');
    logger.info('');

    // Explorar ProductVariant fields
    logger.info('=== ProductVariant Fields ===');
    const variantSchema = await shopifyClient.graphql<any>(introspectionQuery);
    
    if (variantSchema.__type) {
      logger.info(`Campos disponibles en ProductVariant:`);
      variantSchema.__type.fields.forEach((field: any) => {
        const deprecated = field.isDeprecated ? ' [DEPRECATED]' : '';
        logger.info(`  - ${field.name}: ${field.type.name || field.type.kind}${deprecated}`);
      });
    }

    logger.info('');
    
    // Explorar Image fields
    logger.info('=== Image Fields ===');
    const imageSchema = await shopifyClient.graphql<any>(productImageQuery);
    
    if (imageSchema.__type) {
      logger.info(`Campos disponibles en Image:`);
      imageSchema.__type.fields.forEach((field: any) => {
        const deprecated = field.isDeprecated ? ' [DEPRECATED]' : '';
        logger.info(`  - ${field.name}: ${field.type.name || field.type.kind}${deprecated}`);
      });
    }

    logger.info('');
    logger.info('✓ Schema exploration completed');

  } catch (error) {
    logger.error('Schema exploration failed', error);
    process.exit(1);
  }
}

exploreSchema();
