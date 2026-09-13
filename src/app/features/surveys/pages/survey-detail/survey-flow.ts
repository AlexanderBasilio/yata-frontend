import { BranchingRuleResponse, QuestionResponse, SubmitSurveyAnswerItem } from '../../../../core/models/portal-survey.model';

export function hasAnswer(a: SubmitSurveyAnswerItem): boolean {
  return a.selectedOptionIds.length > 0 || !!a.textValue?.trim() || a.numericValue !== null;
}

export function answerError(q: QuestionResponse, a: SubmitSurveyAnswerItem): string {
  if (!['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'YES_NO', 'TEXT', 'LONG_TEXT', 'RATING', 'NUMBER', 'SCALE'].includes(q.questionType)) {
    return 'Este tipo de pregunta aún no está disponible.';
  }
  if (q.questionType === 'YES_NO' && !q.options?.length) return 'Esta pregunta no tiene opciones configuradas.';
  if (!hasAnswer(a)) return q.isRequired ? 'Responde esta pregunta para continuar.' : '';
  if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'YES_NO'].includes(q.questionType)) {
    const count = a.selectedOptionIds.length;
    if (a.selectedOptionIds.some(id => !q.options?.some(o => o.id === id))) return 'Selecciona una opción válida.';
    if (count < (q.minSelections ?? 1)) return 'Selecciona al menos ' + (q.minSelections ?? 1) + ' opciones.';
    const max = q.questionType === 'MULTIPLE_CHOICE' ? q.maxSelections : 1;
    if (max !== null && count > max) return 'Selecciona como máximo ' + max + ' opciones.';
  }
  if (a.numericValue !== null && !Number.isFinite(a.numericValue)) return 'Ingresa un número válido.';
  return '';
}

// The first matching rule in backend order wins. Option conditions compare membership;
// scalar conditions compare text or numeric values. No answer never matches a rule.
export function matchesRule(q: QuestionResponse, a: SubmitSurveyAnswerItem, r: BranchingRuleResponse): boolean {
  if (!hasAnswer(a) || r.questionUuid !== q.uuid) return false;
  if (r.optionUuid) {
    const option = q.options?.find(o => o.uuid === r.optionUuid);
    if (!option) return false;
    const selected = a.selectedOptionIds.includes(option.id);
    return r.conditionOperator === 'EQUALS' ? selected : r.conditionOperator === 'NOT_EQUALS' ? !selected : false;
  }
  const value = a.numericValue ?? a.textValue ?? q.options?.find(o => a.selectedOptionIds.includes(o.id))?.value;
  if (value == null || r.conditionValue == null) return false;
  if (r.conditionOperator === 'EQUALS') return a.numericValue !== null ? a.numericValue === Number(r.conditionValue) : String(value) === r.conditionValue;
  if (r.conditionOperator === 'NOT_EQUALS') return a.numericValue !== null ? a.numericValue !== Number(r.conditionValue) : String(value) !== r.conditionValue;
  if (!String(value).trim() || !r.conditionValue.trim()) return false;
  const left = Number(value), right = Number(r.conditionValue);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  switch (r.conditionOperator) {
    case 'GREATER_THAN': return left > right;
    case 'LESS_THAN': return left < right;
    case 'GREATER_THAN_OR_EQUAL': return left >= right;
    case 'LESS_THAN_OR_EQUAL': return left <= right;
    default: return false;
  }
}
