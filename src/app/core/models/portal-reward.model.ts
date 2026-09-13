export type RewardStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED' | string;
export type RewardSourceType = 'SURVEY' | 'ORDER' | 'REFERRAL' | 'PROMOTION' | 'SYSTEM' | string;

export interface RewardResponse {
  id: string | number;
  uuid?: string;
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
  status: RewardStatus;
  zisiCoinsAwarded: number;
  xpAwarded: number;
  newBalanceZisiCoins?: number;
  newTotalXp?: number;
  message?: string;
}
