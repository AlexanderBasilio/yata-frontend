export type NotificationType = 
  | 'SURVEY_INVITATION' 
  | 'SURVEY_APPROVED' 
  | 'REWARD_PENDING' 
  | 'REWARD_CLAIMED' 
  | 'ORDER_STATUS' 
  | 'PROMOTION' 
  | 'SYSTEM' 
  | string;

export type ReferenceType = 
  | 'SURVEY_RESPONSE' 
  | 'SURVEY' 
  | 'REWARD' 
  | 'ORDER' 
  | 'REFERRAL' 
  | 'PROMOTION' 
  | 'SYSTEM' 
  | string;

export type ActionType = 
  | 'NAVIGATE' 
  | 'CLAIM' 
  | 'OPEN_MODAL' 
  | 'EXTERNAL_LINK' 
  | string;

export interface ReferenceDto {
  type: ReferenceType;
  id: string;
}

export interface ActionDto {
  type: ActionType;
  label: string;
  url?: string;
}

export interface NotificationResponse {
  uuid: string;
  type: NotificationType;
  title: string;
  message: string;
  reference?: ReferenceDto;
  action?: ActionDto;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface RestPageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
