export interface CustomerUnifiedOrdersCountsDto {
  total: number;
  restaurants: number;
  market: number;
  liquor?: number;
  pendingPayment: number;
  active: number;
  completed: number;
  cancelled: number;
}

export interface CustomerUnifiedOrderTabDto {
  key: string;
  label: string;
  count: number;
}

export interface CustomerUnifiedOrderDto {
  orderCode: string;
  vertical: 'MARKET' | 'RESTAURANTS' | 'LIQUOR' | string;
  verticalLabel?: string;
  verticalIcon?: string;
  requiresAdultVerification?: boolean;
  businessName?: string;
  itemsCount?: number;
  itemsSummary?: string;
  totalAmount: number;
  currency?: string;
  status: string;
  statusLabel?: string;
  statusGroup?: string;
  statusColor?: string;
  canPayNow?: boolean;
  paymentActionUrl?: string;
  canTrack?: boolean;
  trackingUrl?: string;
  createdAt: string;
  discountAmount?: number;
  appliedDiscounts?: { displayName: string; amount: number }[];
  estimatedLoyaltyPoints?: number;
  subtotalAmount?: number;
}

export interface CustomerUnifiedOrdersResponse {
  orders: CustomerUnifiedOrderDto[];
  counts: CustomerUnifiedOrdersCountsDto;
  statusTabs: CustomerUnifiedOrderTabDto[];
}
