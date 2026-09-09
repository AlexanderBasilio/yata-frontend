export interface AddressDto {
  id?: number;
  label?: string;
  streetAddress?: string;
  reference?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  zoneId?: string;
}

export interface CustomerHeaderSummaryDto {
  customerName?: string;
  currentIdentity?: string;
  defaultAddress?: AddressDto;
  totalOrders?: number;
  zisiCoins?: number;
  referrals?: string;
}

export interface NotificationSummaryDto {
  unreadCount: number;
}

export interface RewardSummaryDto {
  pendingClaimCount: number;
}

export interface HomeSummaryResponse {
  header: CustomerHeaderSummaryDto;
  notifications: NotificationSummaryDto;
  rewards: RewardSummaryDto;
}
