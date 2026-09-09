import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { 
  EnrichedSurveySummaryResponse, 
  SurveyDetailResponse, 
  SubmitSurveyResponseRequest, 
  SurveySubmissionResultResponse 
} from '../../models/portal-survey.model';

@Injectable({
  providedIn: 'root'
})
export class PortalSurveyService {
  private http = inject(HttpClient);

  private get portalApiUrl(): string {
    return environment.portalUrl || 'https://zisify-portal-production-b174.up.railway.app/api/v1';
  }

  /**
   * 📋 GET /api/v1/portal/surveys/feed
   * Listado de encuestas activas elegibles para el usuario con detalle de recompensa
   */
  getSurveysFeed(): Observable<EnrichedSurveySummaryResponse[]> {
    const url = `${this.portalApiUrl}/portal/surveys/feed`;
    return this.http.get<EnrichedSurveySummaryResponse[]>(url).pipe(
      tap(feed => {
        console.group('📋 [GET HTTP] Feed de Encuestas');
        console.log('📦 Cantidad:', feed?.length);
        console.groupEnd();
      }),
      catchError(err => {
        console.warn('⚠️ Error al obtener Feed de Encuestas:', err);
        return of([]);
      })
    );
  }

  /**
   * 🔍 GET /api/v1/portal/surveys/{surveyUuid}
   * Detalle completo de una encuesta con árbol de preguntas y opciones
   */
  getSurveyDetail(surveyUuid: string): Observable<SurveyDetailResponse | null> {
    const url = `${this.portalApiUrl}/portal/surveys/${surveyUuid}`;
    return this.http.get<SurveyDetailResponse>(url).pipe(
      tap(detail => {
        console.group('🔍 [GET HTTP] Detalle de Encuesta:', surveyUuid);
        console.log('📦 Encuesta:', detail?.name);
        console.groupEnd();
      }),
      catchError(err => {
        console.error('❌ Error al obtener Detalle de Encuesta:', err);
        return of(null);
      })
    );
  }

  /**
   * 📤 POST /api/v1/portal/surveys/{surveyUuid}/submit
   * Envío de respuestas de una encuesta
   */
  submitSurvey(surveyUuid: string, request: SubmitSurveyResponseRequest): Observable<SurveySubmissionResultResponse> {
    const url = `${this.portalApiUrl}/portal/surveys/${surveyUuid}/submit`;
    console.group('📤 [POST HTTP] Enviando Respuestas de Encuesta:', surveyUuid);
    console.log('📦 Payload:', request);
    console.groupEnd();
    return this.http.post<SurveySubmissionResultResponse>(url, request);
  }
}
