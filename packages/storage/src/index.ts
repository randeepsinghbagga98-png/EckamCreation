export type MediaKind =
  | "product-image"
  | "product-video"
  | "product-360"
  | "product-3d"
  | "category-banner"
  | "collection-artwork";

export type SignedUpload = {
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
};

export interface ObjectStorageService {
  isConfigured(): boolean;
  createSignedUpload?(input: {
    kind: MediaKind;
    contentType: string;
    filename: string;
  }): Promise<SignedUpload>;
  getPublicUrl?(storageKey: string): string;
}

export class NotImplementedStorageError extends Error {
  readonly code = "NOT_IMPLEMENTED" as const;
  constructor(method: string) {
    super(`ObjectStorageService.${method} is not implemented yet`);
    this.name = "NotImplementedStorageError";
  }
}

export function createObjectStorageService(bucket?: string): ObjectStorageService {
  return {
    isConfigured() {
      return Boolean(bucket);
    },
    async createSignedUpload() {
      throw new NotImplementedStorageError("createSignedUpload");
    },
    getPublicUrl() {
      throw new NotImplementedStorageError("getPublicUrl");
    },
  };
}
