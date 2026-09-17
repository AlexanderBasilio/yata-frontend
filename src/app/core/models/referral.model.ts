export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'CANCELLED' | 'EXPIRED';
export interface ReferredFriend {
  referredUserId: string;
  name: string;
  status: ReferralStatus;
  joinedAt: string;
  qualifiedAt: string | null;
}
export interface ReferralProfile {
  referralCode: string | null;
  shareUrl: string | null;
  isEligible: boolean;
  ineligibilityReason: string | null;
  totalInvited: number;
  totalPending: number;
  totalQualified: number;
  friends: ReferredFriend[];
  activeRewardDescription: string | null;
}
export interface ReferralEligibility {
  canApplyCode: boolean;
  alreadyReferred: boolean;
  hasOrders: boolean;
  appliedReferralCode: string | null;
  reason: string | null;
}
export interface ReferralValidation { valid: boolean; referrerName: string | null; message: string; }
export interface ReferralApplication { success: boolean; referrerName: string | null; message: string; }
export interface ReferralConfig {
  active: boolean;
  rewardDefinitionId: string | null;
  rewardDefinitionName: string | null;
  minOrderAmount: number;
  referrerMinOrders: number;
  requireGoogleAuth: boolean;
  updatedAt: string | null;
}
