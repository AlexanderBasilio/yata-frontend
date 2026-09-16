export type RewardStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED' | string;
export type RewardSourceType = 'SURVEY' | 'ORDER' | 'REFERRAL' | 'PROMOTION' | 'SYSTEM' | string;

export interface RewardResponse {
  id?: string | number;
  uuid?: string;
  rewardId?: string | number;
  sourceType: RewardSourceType;
  sourceReferenceId?: string;
  title: string;
  description?: string;
  zisiCoins: number;
  xp: number;
  status: RewardStatus;
  expiresAt?: string;
  claimedAt?: string;
  createdAt: string;
}

export interface PendingRewardsCountResponse {
  count: number;
}

/** Platform's benefit DTO, separate from the legacy Portal reward DTO. */
export interface AvailableBenefitResponse {
  uuid?: string;
  id?: string;
  rewardId?: string;
  status: 'PENDING_CLAIM' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  usageStatus: 'NOT_APPLICABLE' | 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED';
  source?: { type: string; id: string };
  definition?: { code: string; name: string };
  items: RewardItemResponse[];
  requiresClaim?: boolean;
  requiresUsage?: boolean;
  claimedAt?: string | null;
  usedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface ClaimRewardResponse {
  rewardId: string | number;
  message?: string;
  claimedAt?: string;
  claimedItems?: RewardItemResponse[];
  // Campos legacy, mantenidos mientras conviven ambas versiones del backend.
  status?: RewardStatus;
  zisiCoinsAwarded?: number;
  xpAwarded?: number;
  newBalanceZisiCoins?: number;
  newTotalXp?: number;
}

export type RewardItemType = 'ZISI_COINS' | 'XP_POINTS' | 'FREE_DELIVERY' | 'DISCOUNT_VOUCHER' | 'FREE_ITEM' | string;

export interface RewardItemResponse {
  id: number;
  itemType: RewardItemType;
  baseAmount?: number | null;
  multiplier?: number | null;
  finalAmount?: number | null;
  metadata?: Record<string, unknown> | null;
}
