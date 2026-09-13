import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PortalSurveyService } from '../../../../core/services/portal/portal-survey.service';
import { SurveyDetailResponse, QuestionResponse, SubmitSurveyAnswerItem, SurveySubmissionResultResponse } from '../../../../core/models/portal-survey.model';
import { answerError, hasAnswer, matchesRule } from './survey-flow';

@Component({
  selector: 'app-survey-detail', standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './survey-detail.component.html', styleUrl: './survey-detail.component.scss'
})
export class SurveyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private service = inject(PortalSurveyService);
  private detailRequest?: Subscription;
  surveyUuid = signal('');
  survey = signal<SurveyDetailResponse | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);
  error = signal('');
  validation = signal('');
  answers = signal<Record<number, SubmitSurveyAnswerItem>>({});
  path = signal<string[]>([]);
  complete = signal(false);
  submissionResult = signal<SurveySubmissionResultResponse | null>(null);
  current = computed(() => this.survey()?.questions.find(q => q.uuid === this.path().at(-1)));
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.surveyUuid.set(params.get('uuid') || '');
      this.load();
    });
  }
  load() {
    this.detailRequest?.unsubscribe();
    this.survey.set(null);
    this.answers.set({});
    this.path.set([]);
    this.complete.set(false);
    this.submissionResult.set(null);
    this.error.set('');
    this.validation.set('');
    this.isLoading.set(true);
    this.detailRequest = this.service.getSurveyDetail(this.surveyUuid()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: detail => {
        this.isLoading.set(false);
        if (!detail || detail.status !== 'ACTIVE' || !detail.questions?.length) {
          this.error.set('Esta encuesta no está disponible para responder.');
          return;
        }
        detail.questions = [...detail.questions].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map(q => ({
          ...q, options: [...(q.options || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        }));
        this.survey.set(detail);
        this.path.set([detail.questions[0].uuid]);
      },
      error: () => { this.isLoading.set(false); this.error.set('No se pudo cargar la encuesta. Verifica tu acceso e inténtalo de nuevo.'); }
    });
  }
  answer(q: QuestionResponse): SubmitSurveyAnswerItem {
    return this.answers()[q.id] ?? { questionId: q.id, selectedOptionIds: [], textValue: null, numericValue: null };
  }
  update(q: QuestionResponse, patch: Partial<SubmitSurveyAnswerItem>) {
    if (this.isSubmitting() || this.submissionResult()) return;
    this.answers.update(all => ({ ...all, [q.id]: { ...this.answer(q), ...patch } }));
    this.validation.set('');
    this.error.set('');
  }
  choose(q: QuestionResponse, id: number) {
    const ids = this.answer(q).selectedOptionIds;
    this.update(q, { selectedOptionIds: q.questionType === 'MULTIPLE_CHOICE' ? (ids.includes(id) ? ids.filter(v => v !== id) : [...ids, id]) : [id] });
  }
  advance() {
    const q = this.current(), s = this.survey();
    if (!q || !s || this.isSubmitting()) return;
    const a = this.answer(q);
    const error = answerError(q, a);
    this.validation.set(error);
    if (error) return;
    const rule = (q.branchingRules || []).find(r => matchesRule(q, a, r));
    const next = rule ? (rule.actionType === 'END_SURVEY' ? null : s.questions.find(v => v.uuid === rule.targetQuestionUuid)) : s.questions[s.questions.indexOf(q) + 1];
    if (rule?.actionType === 'GO_TO_QUESTION' && !next || next && this.path().includes(next.uuid)) {
      this.validation.set('La encuesta tiene una ruta inválida. No es posible continuar.');
      return;
    }
    if (!next) { this.complete.set(true); return; }
    this.path.update(path => [...path, next.uuid]);
  }
  back() {
    if (this.isSubmitting()) return;
    this.validation.set('');
    this.error.set('');
    if (this.complete()) { this.complete.set(false); return; }
    if (this.path().length <= 1) return;
    const q = this.current();
    if (q) this.answers.update(all => { const copy = { ...all }; delete copy[q.id]; return copy; });
    this.path.update(path => path.slice(0, -1));
  }
  onSubmit() {
    const s = this.survey();
    if (!s || !this.complete() || this.isSubmitting() || this.submissionResult()) return;
    const questions = this.path().map(uuid => s.questions.find(q => q.uuid === uuid)!);
    if (questions.some(q => answerError(q, this.answer(q)))) return;
    const answers = questions.map(q => this.answer(q)).filter(hasAnswer).map(a => ({ ...a, textValue: a.textValue?.trim() || null }));
    if (!answers.length) { this.error.set('Responde al menos una pregunta antes de enviar.'); return; }
    this.isSubmitting.set(true);
    this.error.set('');
    this.service.submitSurvey(this.surveyUuid(), { answers }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.isSubmitting.set(false);
        if (!result?.responseUuid || !['SUBMITTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS'].includes(result.status)) {
          this.error.set('No se pudo confirmar el resultado del envío.'); return;
        }
        this.submissionResult.set(result);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.error.set('No se pudo confirmar el envío. Tus respuestas se conservan; puedes volver a intentarlo.');
      }
    });
  }
}
