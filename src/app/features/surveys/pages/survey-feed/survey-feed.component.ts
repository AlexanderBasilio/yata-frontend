import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PortalSurveyService } from '../../../../core/services/portal/portal-survey.service';
import { EnrichedSurveySummaryResponse } from '../../../../core/models/portal-survey.model';

@Component({
  selector: 'app-survey-feed',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './survey-feed.component.html',
  styleUrl: './survey-feed.component.scss'
})
export class SurveyFeedComponent implements OnInit {
  private surveyService = inject(PortalSurveyService);
  private router = inject(Router);

  surveys = signal<EnrichedSurveySummaryResponse[]>([]);
  isLoading = signal(true);
  error = signal('');

  ngOnInit() {
    this.loadSurveys();
  }

  loadSurveys() {
    this.isLoading.set(true);
    this.error.set('');
    this.surveyService.getSurveysFeed().subscribe({
      next: (feed) => {
        this.surveys.set(feed || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.surveys.set([]);
        this.error.set('No se pudieron cargar las encuestas. Inténtalo de nuevo.');
        this.isLoading.set(false);
      }
    });
  }

  onStartSurvey(survey: EnrichedSurveySummaryResponse) {
    this.router.navigate(['/surveys', survey.uuid]);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
