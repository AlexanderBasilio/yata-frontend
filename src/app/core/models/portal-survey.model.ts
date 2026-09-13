export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type SurveyResponseStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type QuestionType = string;
export type RewardItemType = 'ZISI_COINS' | 'XP_POINTS' | 'DISCOUNT_VOUCHER' | 'FREE_ITEM';
export interface RewardItemResponse {
  id: number;
  itemType: RewardItemType;
  baseAmount: number;
  multiplier: number;
  finalAmount: number;
  metadata: Record<string, unknown> | null;
}
export interface RewardDefinitionResponse {
  id: string;
  name: string;
  description: string;
  active: boolean;
  requiresClaim: boolean;
  requiresUsage: boolean;
  expirationDays: number | null;
  items: RewardItemResponse[];
  createdAt: string;
}
export interface EnrichedSurveySummaryResponse {
  id: number;
  uuid: string;
  name: string;
  description: string;
  status: SurveyStatus;
  cooldownDays: number | null;
  rewardEnabled: boolean;
  rewardDetail?: RewardDefinitionResponse | null;
}
export interface QuestionOptionResponse {
  id: number;
  uuid: string;
  label: string;
  value: string;
  displayOrder: number | null;
}
export type ComparisonOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN_OR_EQUAL';
export interface BranchingRuleResponse {
  id: number;
  questionUuid: string;
  optionUuid: string | null;
  conditionOperator: ComparisonOperator;
  conditionValue: string | null;
  actionType: 'GO_TO_QUESTION' | 'END_SURVEY';
  targetQuestionUuid: string | null;
}
export interface QuestionResponse {
  id: number;
  uuid: string;
  question: string;
  description: string;
  questionType: QuestionType;
  isRequired: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  displayOrder: number | null;
  options: QuestionOptionResponse[];
  branchingRules: BranchingRuleResponse[];
}
export interface SurveyDetailResponse {
  id: number;
  uuid: string;
  name: string;
  description: string;
  status: SurveyStatus;
  startsAt: string | null;
  endsAt: string | null;
  cooldownDays: number | null;
  requiresReview: boolean;
  rewardEnabled: boolean;
  rewardDefinitionId: string | null;
  questions: QuestionResponse[];
}
export interface SubmitSurveyAnswerItem {
  questionId: number;
  selectedOptionIds: number[];
  textValue: string | null;
  numericValue: number | null;
}
export interface SubmitSurveyResponseRequest { answers: SubmitSurveyAnswerItem[]; }
export interface SurveySubmissionResultResponse {
  responseUuid: string;
  surveyUuid: string;
  status: SurveyResponseStatus;
  requiresReview: boolean;
  submittedAt: string;
  message: string;
}
