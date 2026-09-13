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

export type RewardItemType = 'ZISI_COINS' | 'XP_POINTS' | 'DISCOUNT_VOUCHER' | 'FREE_ITEM' | string;

export interface RewardItemResponse {
  id: number;
  itemType: RewardItemType;
  baseAmount?: number | null;
  multiplier?: number | null;
  finalAmount?: number | null;
  metadata?: Record<string, unknown> | null;
}
