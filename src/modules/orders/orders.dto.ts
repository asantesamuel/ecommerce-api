// Order request/response DTOs consumed by tsoa.

export interface ShippingAddressDto {
  /** @minLength 2 @maxLength 100 */
  fullName: string;

  /** @minLength 5 @maxLength 200 */
  addressLine1: string;

  addressLine2?: string;

  /** @minLength 2 @maxLength 100 */
  city: string;

  /** @minLength 2 @maxLength 100 */
  state: string;

  /** @minLength 2 @maxLength 20 */
  postalCode: string;

  /** @minLength 2 @maxLength 2 @pattern ^[A-Z]{2}$ */
  country: string; // ISO 3166-1 alpha-2 e.g. GH, NG, KE

  /** @pattern ^\+?[1-9]\d{1,14}$ */
  phone: string;
}

export interface CheckoutDto {
  shippingAddress: ShippingAddressDto;

  /** @minLength 3 @maxLength 3 @pattern ^[A-Z]{3}$ */
  currency: string; // GHS | NGN | KES | ZAR | USD

  callbackUrl?: string; // URL Paystack redirects to after payment
}

export interface OrderItemResponseDto {
  id:        string;
  product: {
    id:   string;
    name: string;
    slug: string;
  };
  quantity:  number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderResponseDto {
  id:                   string;
  status:               string;
  subtotal:             number;
  tax:                  number;
  total:                number;
  currency:             string;
  shippingAddress:      ShippingAddressDto;
  paystackReference:    string;
  paymentUrl:           string; // redirect customer here to pay
  items:                OrderItemResponseDto[];
  placedAt:             Date;
  updatedAt:            Date;
}

export interface OrderListResponseDto {
  data:       OrderResponseDto[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface RefundDto {
  orderId:        string;
  amount?:        number; // omit for full refund
  /** @minLength 5 @maxLength 200 */
  reason:         string;
}
