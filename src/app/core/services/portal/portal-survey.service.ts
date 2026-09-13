import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { EnrichedSurveySummaryResponse, SurveyDetailResponse, SubmitSurveyResponseRequest, SurveySubmissionResultResponse } from '../../models/portal-survey.model';

@Injectable({ providedIn: 'root' })
export class PortalSurveyService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.portalUrl.replace(/\/$/, '') + '/portal/surveys';

  getSurveysFeed() {
    return this.http.get<EnrichedSurveySummaryResponse[]>(this.baseUrl + '/feed');
  }
  getSurveyDetail(uuid: string) {
    return this.http.get<SurveyDetailResponse>(this.baseUrl + '/' + encodeURIComponent(uuid));
  }
  submitSurvey(uuid: string, request: SubmitSurveyResponseRequest) {
    return this.http.post<SurveySubmissionResultResponse>(this.baseUrl + '/' + encodeURIComponent(uuid) + '/submit', request);
  }
}
