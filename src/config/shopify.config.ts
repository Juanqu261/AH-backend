import { z } from 'zod';

// Validar variables de entorno de Shopify
const ShopifyEnvSchema = z.object({
  SHOPIFY_STORE: z.string().min(1, 'SHOPIFY_STORE is required'),
  SHOPIFY_CLIENT_ID: z.string().min(1, 'SHOPIFY_CLIENT_ID is required'),
  SHOPIFY_CLIENT_SECRET: z.string().min(1, 'SHOPIFY_CLIENT_SECRET is required'),
});

export interface ShopifyConfig {
  store: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  oauthUrl: string;
  graphqlUrl: string;
}

export function getShopifyConfig(): ShopifyConfig {
  const env = ShopifyEnvSchema.parse({
    SHOPIFY_STORE: process.env.SHOPIFY_STORE,
    SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID,
    SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET,
  });

  const apiVersion = '2024-10';
  const store = env.SHOPIFY_STORE.includes('.myshopify.com')
    ? env.SHOPIFY_STORE.split('.')[0]
    : env.SHOPIFY_STORE;

  return {
    store,
    clientId: env.SHOPIFY_CLIENT_ID,
    clientSecret: env.SHOPIFY_CLIENT_SECRET,
    apiVersion,
    oauthUrl: `https://${store}.myshopify.com/admin/oauth/access_token`,
    graphqlUrl: `https://${store}.myshopify.com/admin/api/${apiVersion}/graphql.json`,
  };
}
