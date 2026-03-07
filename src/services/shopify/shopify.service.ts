import {
    ShopifyAccessTokenResponse,
    ShopifyGraphQLResponse,
    GetProductsQueryResponse,
    GetProductByHandleQueryResponse,
} from '@/services/shopify/shopify.types';
import { logger } from '@/utils/logger';
import { getShopifyConfig } from '@/config/shopify.config';

/**
 * Cliente Shopify que maneja:
 * - Obtención y renovación de access tokens
 * - Requests GraphQL autenticados
 * - Manejo de errores y reintentos
 */
class ShopifyClient {
  private config = getShopifyConfig();
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenRefreshPromise: Promise<string> | null = null;

  /**
   * Obtiene el access token actual o solicita uno nuevo si expiró
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Si ya tenemos un token válido, devolverlo
    if (this.accessToken && this.tokenExpiresAt > now + 60000) {
      return this.accessToken;
    }

    // Si ya hay un refresh en progreso, esperar ese
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    // Solicitar nuevo token
    this.tokenRefreshPromise = this.requestNewToken();
    try {
      const token = await this.tokenRefreshPromise;
      return token;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Solicita un nuevo access token a Shopify OAuth
   * Usa client credentials flow (sin usuario)
   */
  private async requestNewToken(): Promise<string> {
    try {
      logger.info('Requesting new access token from Shopify...');

      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);

      const response = await fetch(this.config.oauthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `OAuth failed: ${response.status} - ${errorData}`,
        );
      }

      const data = await response.json() as ShopifyAccessTokenResponse;

      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

      logger.info(
        `Access token obtained. Expires in ${data.expires_in} seconds`,
      );

      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get access token', error);
      throw error;
    }
  }

  /**
   * Ejecuta una query GraphQL autenticada
   */
  async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const token = await this.getAccessToken();

    try {
      logger.debug('Executing GraphQL query', { hasVariables: !!variables });

      const response = await fetch(this.config.graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({
          query,
          variables: variables || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const data = await response.json() as ShopifyGraphQLResponse<T>;

      // Verificar si hay errores en la respuesta GraphQL
      if (data.errors && data.errors.length > 0) {
        logger.error('GraphQL errors', data.errors);
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return data.data as T;
    } catch (error) {
      logger.error('GraphQL request failed', error);
      throw error;
    }
  }

  /**
   * Query para obtener productos paginados
   * @param limit Cantidad de productos por página (máx 250)
   * @param after Cursor para paginar
   */
  async getProducts(
    limit: number = 250,
    after?: string,
  ): Promise<GetProductsQueryResponse> {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              handle
              title
              description
              images(first: 10) {
                edges {
                  node {
                    id
                    altText
                    url
                  }
                }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    availableForSale
                    sellableOnlineQuantity
                  }
                }
              }
              updatedAt
              createdAt
            }
            cursor
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    return this.graphql<GetProductsQueryResponse>(query, {
      first: Math.min(limit, 250), // Shopify máximo 250
      after: after || null,
    });
  }

  /**
   * Query para obtener un producto específico por handle
   */
  async getProductByHandle(
    handle: string,
  ): Promise<GetProductByHandleQueryResponse> {
    const query = `
      query GetProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          handle
          title
          description
          images(first: 10) {
            edges {
              node {
                id
                altText
                url
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                availableForSale
                sellableOnlineQuantity
              }
            }
          }
          updatedAt
          createdAt
        }
      }
    `;

    return this.graphql<GetProductByHandleQueryResponse>(query, {
      handle,
    });
  }

  /**
   * Query avanzada para obtener productos modificados desde una fecha
   * Útil para delta sync
   */
  async getProductsModifiedSince(
    since: Date,
    limit: number = 250,
    after?: string,
  ): Promise<GetProductsQueryResponse> {
    const query = `
      query GetProductsModified($first: Int!, $query: String!, $after: String) {
        products(first: $first, query: $query, after: $after) {
          edges {
            node {
              id
              handle
              title
              description
              images(first: 10) {
                edges {
                  node {
                    id
                    altText
                    url
                  }
                }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    availableForSale
                    sellableOnlineQuantity
                  }
                }
              }
              updatedAt
              createdAt
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const sinceISO = since.toISOString();

    return this.graphql<GetProductsQueryResponse>(query, {
      first: Math.min(limit, 250),
      query: `updated_at:>='${sinceISO}'`,
      after: after || null,
    });
  }
}

// Exportar instancia singleton
export const shopifyClient = new ShopifyClient();
