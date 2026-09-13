import { QuestionResponse, SubmitSurveyAnswerItem, BranchingRuleResponse } from '../../../../core/models/portal-survey.model';
import { answerError, hasAnswer, matchesRule } from './survey-flow';

describe('Survey branching and validation', () => {
  const q: QuestionResponse = {
    id: 101, uuid: 'q1', question: 'Elige', description: '', questionType: 'MULTIPLE_CHOICE',
    isRequired: true, minSelections: 1, maxSelections: 2, displayOrder: 0,
    options: [{ id: 201, uuid: 'o1', label: 'Sí', value: 'yes', displayOrder: 0 }],
    branchingRules: []
  };
  const answer: SubmitSurveyAnswerItem = { questionId: 101, selectedOptionIds: [201], textValue: null, numericValue: null };
  const rule: BranchingRuleResponse = { id: 1, questionUuid: 'q1', optionUuid: 'o1', conditionOperator: 'EQUALS', conditionValue: null, actionType: 'END_SURVEY', targetQuestionUuid: null };
  it('matches option UUID against selected numeric IDs', () => {
    expect(matchesRule(q, answer, rule)).toBeTrue();
    expect(matchesRule(q, { ...answer, selectedOptionIds: [] }, rule)).toBeFalse();
  });
  it('does not trigger NOT_EQUALS on an unanswered optional question', () => {
    expect(matchesRule(q, { ...answer, selectedOptionIds: [] }, { ...rule, conditionOperator: 'NOT_EQUALS' })).toBeFalse();
  });
  it('compares numbers numerically, including zero', () => {
    const numeric = { ...answer, selectedOptionIds: [], numericValue: 10 };
    expect(matchesRule(q, numeric, { ...rule, optionUuid: null, conditionOperator: 'GREATER_THAN', conditionValue: '2' })).toBeTrue();
    expect(hasAnswer({ ...numeric, numericValue: 0 })).toBeTrue();
  });
  it('supports every scalar comparison', () => {
    for (const conditionOperator of ['EQUALS', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL'] as const) {
      expect(matchesRule(q, { ...answer, numericValue: 2 }, { ...rule, optionUuid: null, conditionOperator, conditionValue: '2' })).toBeTrue();
    }
    expect(matchesRule(q, { ...answer, numericValue: 1 }, { ...rule, optionUuid: null, conditionOperator: 'LESS_THAN', conditionValue: '2' })).toBeTrue();
    expect(matchesRule(q, { ...answer, textValue: 'otro' }, { ...rule, optionUuid: null, conditionOperator: 'NOT_EQUALS', conditionValue: 'yes' })).toBeTrue();
  });
  it('validates required text and optional selection bounds', () => {
    expect(answerError({ ...q, questionType: 'TEXT' }, { ...answer, selectedOptionIds: [], textValue: '  ' })).not.toBe('');
    expect(answerError({ ...q, isRequired: false, minSelections: 2 }, answer)).not.toBe('');
    expect(answerError({ ...q, maxSelections: 0 }, answer)).not.toBe('');
    expect(answerError(q, answer)).toBe('');
  });
  it('blocks unknown question types and invalid numeric values', () => {
    expect(answerError({ ...q, questionType: 'UNKNOWN' }, answer)).not.toBe('');
    expect(answerError({ ...q, questionType: 'NUMERIC' }, { ...answer, selectedOptionIds: [], numericValue: NaN })).not.toBe('');
  });
});
