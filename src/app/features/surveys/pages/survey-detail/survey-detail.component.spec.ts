import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SurveyDetailComponent } from './survey-detail.component';
import { PortalSurveyService } from '../../../../core/services/portal/portal-survey.service';
import { QuestionResponse, SurveyDetailResponse } from '../../../../core/models/portal-survey.model';

describe('Survey customer progression', () => {
  let component: SurveyDetailComponent;
  let service: jasmine.SpyObj<PortalSurveyService>;
  const question = (id: number): QuestionResponse => ({
    id, uuid: 'q' + id, question: 'Pregunta', description: '', questionType: 'TEXT', isRequired: true,
    minSelections: null, maxSelections: null, displayOrder: id, options: [], branchingRules: []
  });
  beforeEach(() => {
    service = jasmine.createSpyObj('PortalSurveyService', ['getSurveyDetail', 'submitSurvey']);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: PortalSurveyService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of() } }
    ] });
    component = TestBed.runInInjectionContext(() => new SurveyDetailComponent());
    component.survey.set({ uuid: 'survey', questions: [question(1), question(2), question(3)] } as SurveyDetailResponse);
    component.surveyUuid.set('survey');
    component.path.set(['q1']);
  });
  it('jumps over required questions and posts only the visited answers using the DTO', () => {
    const q = component.current()!;
    q.branchingRules = [{ id: 1, questionUuid: q.uuid, optionUuid: null, conditionOperator: 'EQUALS', conditionValue: 'skip', actionType: 'GO_TO_QUESTION', targetQuestionUuid: 'q3' }];
    component.update(q, { textValue: 'skip' });
    component.advance();
    expect(component.current()?.id).toBe(3);
    component.update(component.current()!, { textValue: 'fin' });
    component.advance();
    service.submitSurvey.and.returnValue(of({ responseUuid: 'response', surveyUuid: 'survey', status: 'SUBMITTED', requiresReview: true, submittedAt: '', message: 'Pending' }));
    component.onSubmit();
    expect(service.submitSurvey).toHaveBeenCalledWith('survey', { answers: [
      { questionId: 1, selectedOptionIds: [], textValue: 'skip', numericValue: null },
      { questionId: 3, selectedOptionIds: [], textValue: 'fin', numericValue: null }
    ] });
    expect(component.submissionResult()?.requiresReview).toBeTrue();
    component.onSubmit();
    expect(service.submitSurvey).toHaveBeenCalledTimes(1);
  });
  it('clears downstream answers when returning to change a branch', () => {
    component.update(component.current()!, { textValue: 'a' });
    component.advance();
    component.update(component.current()!, { textValue: 'b' });
    component.back();
    expect(component.answers()[2]).toBeUndefined();
  });
  it('honors END_SURVEY and retains answers on failed submit', () => {
    const q = component.current()!;
    q.branchingRules = [{ id: 1, questionUuid: q.uuid, optionUuid: null, conditionOperator: 'EQUALS', conditionValue: 'end', actionType: 'END_SURVEY', targetQuestionUuid: null }];
    component.update(q, { textValue: 'end' });
    component.advance();
    expect(component.complete()).toBeTrue();
    service.submitSurvey.and.returnValue(throwError(() => new Error('offline')));
    component.onSubmit();
    expect(component.submissionResult()).toBeNull();
    expect(component.answer(q).textValue).toBe('end');
    expect(component.error()).not.toBe('');
    expect(component.isSubmitting()).toBeFalse();
  });
  it('blocks cycles and missing branch targets', () => {
    const q = component.current()!;
    const rule = { id: 1, questionUuid: q.uuid, optionUuid: null, conditionOperator: 'EQUALS' as const, conditionValue: 'a', actionType: 'GO_TO_QUESTION' as const, targetQuestionUuid: q.uuid };
    q.branchingRules = [rule];
    component.update(q, { textValue: 'a' });
    component.advance();
    expect(component.validation()).not.toBe('');
    rule.targetQuestionUuid = 'missing';
    component.advance();
    expect(component.complete()).toBeFalse();
    expect(component.path()).toEqual(['q1']);
  });
});

