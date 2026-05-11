// Cart request/response DTOs consumed by tsoa.

export interface AddCartItemDto {
  productId: string;

  /** @isInt @minimum 1 */
  quantity: number;
}

export interface UpdateCartItemDto {
  /** @isInt @minimum 1 */
  quantity: number;
}

export interface CartItemResponseDto {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrls: string[];
    stockQuantity: number;
  };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartResponseDto {
  id: string;
  items: CartItemResponseDto[];
  itemCount: number;
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}
