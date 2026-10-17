export interface CustomerUnifiedOrdersCountsDto {
  total: number;
  restaurants: number;
  market: number;
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
  vertical: 'MARKET' | 'RESTAURANTS' | string;
  verticalLabel?: string;
  verticalIcon?: string;
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
