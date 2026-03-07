// oauth
export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
  expires_in: number; // segundos
}

// GraphQL
export interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code: string;
      [key: string]: any;
    };
  }>;
}

// Productos
export interface ShopifyProduct {
  id: string; // "gid://shopify/Product/12345"
  handle: string;
  title: string;
  description: string;
  images: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
  variants: {
    edges: Array<{
      node: ShopifyVariant;
    }>;
  };
  updatedAt: string; // ISO date
  createdAt: string; // ISO date
}

export interface ShopifyImage {
  id: string;
  altText: string | null;
  url: string;
  width: number;
  height: number;
}

export interface ShopifyVariant {
  id: string; // "gid://shopify/ProductVariant/12345"
  title: string;
  sku: string | null;
  price: string; // "29.99" - convertir a cents en sync.service
  compareAtPrice: string | null; // Convertir a cents en sync.service
  availableForSale: boolean;
  sellableOnlineQuantity: number; // Cantidad que realmente se puede vender online
}

export interface ShopifyProductEdge {
  node: ShopifyProduct;
  cursor: string;
}

export interface ShopifyProductConnection {
  edges: ShopifyProductEdge[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

// GraphQL Queries
export interface GetProductsQueryResponse {
  products: ShopifyProductConnection;
}

export interface GetProductByHandleQueryResponse {
  productByHandle: ShopifyProduct | null;
}

// Sincronización
export interface ShopifySyncMetadata {
  lastSyncCursor?: string; // Para delta sync (paginar desde el último punto)
  totalProducts?: number;
  newProducts?: number;
  updatedProducts?: number;
  failedProducts?: number;
  syncStartedAt?: string; // ISO date
  syncCompletedAt?: string; // ISO date
}
