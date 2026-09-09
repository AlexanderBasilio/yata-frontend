export type SurveyStatus = 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'ARCHIVED' | 'CLOSED' | string;
export type SurveyResponseStatus = 'APPROVED' | 'SUBMITTED' | 'REJECTED' | 'UNDER_REVIEW' | string;
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RATING' | 'TEXT' | 'BOOLEAN' | string;

export interface RewardDefinitionResponse {
  id?: number | string;
  name?: string;
  zisiCoins?: number;
  xp?: number;
  badgeText?: string;
  description?: string;
}

export interface EnrichedSurveySummaryResponse {
  id: number;
  uuid: string;
  name: string;
  description: string;
  status: SurveyStatus;
  cooldownDays?: number;
  rewardEnabled: boolean;
  rewardDetail?: RewardDefinitionResponse;
}

export interface QuestionOptionResponse {
  id: number | string;
  label: string;
  value?: string;
  orderIndex?: number;
}

export interface QuestionResponse {
  id: number | string;
  text: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  orderIndex?: number;
  options?: QuestionOptionResponse[];
  minRating?: number;
  maxRating?: number;
}

export interface SurveyDetailResponse {
  id: number;
  uuid: string;
  name: string;
  description: string;
  status: SurveyStatus;
  rewardEnabled: boolean;
  rewardDetail?: RewardDefinitionResponse;
  questions: QuestionResponse[];
}

export interface SubmitSurveyAnswerItem {
  questionId: number | string;
  selectedOptionIds?: (number | string)[];
  selectedOptionId?: number | string;
  textAnswer?: string;
  ratingValue?: number;
  booleanValue?: boolean;
}

export interface SubmitSurveyResponseRequest {
  answers: SubmitSurveyAnswerItem[];
}

export interface SurveySubmissionResultResponse {
  responseUuid: string;
  surveyUuid: string;
  status: SurveyResponseStatus;
  requiresReview: boolean;
  submittedAt: string;
  message: string;
}
