import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics/analytics.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss']
})
export class PrivacyComponent {
  private router = inject(Router);
  readonly analytics = inject(AnalyticsService);

  goHome() {
    this.router.navigate(['/']);
  }
}
