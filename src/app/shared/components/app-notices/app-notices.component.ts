import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics/analytics.service';
import { AppUpdateService } from '../../../core/services/app-update/app-update.service';

@Component({
  selector: 'app-notices',
  host: { '[class.cookie-prompt]': 'analytics.preferencesOpen()' },
  imports: [RouterLink],
  templateUrl: './app-notices.component.html',
  styleUrl: './app-notices.component.scss'
})
export class AppNoticesComponent {
  readonly analytics = inject(AnalyticsService);
  readonly updates = inject(AppUpdateService);
}
