// Product request/response DTOs consumed by tsoa.

export interface CreateProductDto {
  /** @minLength 2 @maxLength 200 */
  name: string;

  /** @minLength 2 @maxLength 200 @pattern ^[a-z0-9-]+$ */
  slug: string;

  description?: string;

  /** @minimum 0 */
  price: number;

  /** @isInt @minimum 0 */
  stockQuantity: number;

  categoryId?: string;
  imageUrls?: string[];
}

export interface UpdateProductDto {
  /** @minLength 2 @maxLength 200 */
  name?: string;

  /** @minLength 2 @maxLength 200 @pattern ^[a-z0-9-]+$ */
  slug?: string;

  description?: string;

  /** @minimum 0 */
  price?: number;

  /** @isInt @minimum 0 */
  stockQuantity?: number;

  categoryId?: string;
  imageUrls?: string[];
  isActive?: boolean;
}

export interface ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrls: string[];
  approvalStatus: string;
  isActive: boolean;
  category: { id: string; name: string } | null;
  vendor: { id: string; companyName: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListResponseDto {
  data: ProductResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductQueryDto {
  /** @isInt @minimum 1 */
  page?: number;

  /** @isInt @minimum 1 @maximum 100 */
  limit?: number;

  search?: string;
  categoryId?: string;

  /** @minimum 0 */
  minPrice?: number;

  /** @minimum 0 */
  maxPrice?: number;
}
