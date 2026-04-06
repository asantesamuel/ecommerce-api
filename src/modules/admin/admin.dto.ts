export interface ModerateProductDto {
  action: 'approve' | 'reject' | 'flag';
  /** @minLength 5 @maxLength 300 */
  reason?: string;
}

export interface UpdateUserStatusDto {
  isActive: boolean;
  /** @minLength 5 @maxLength 300 */
  reason?: string;
}

export interface AdminUserResponseDto {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  role:      string;
  isActive:  boolean;
  createdAt: Date;
}

export interface AdminUserListResponseDto {
  data:       AdminUserResponseDto[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface LowStockAlertDto {
  productId:     string;
  productName:   string;
  slug:          string;
  stockQuantity: number;
  vendorName:    string;
}

export interface AnalyticsResponseDto {
  overview: {
    totalUsers:    number;
    totalVendors:  number;
    totalProducts: number;
    totalOrders:   number;
    totalRevenue:  number;
  };
  orders: {
    pending:    number;
    paid:       number;
    processing: number;
    shipped:    number;
    delivered:  number;
    refunded:   number;
    cancelled:  number;
    failed:     number;
  };
  recentOrders: any[];
  topProducts:  any[];
}

export interface InventoryResponseDto {
  alerts:      LowStockAlertDto[];
  totalAlerts: number;
  threshold:   number;
}