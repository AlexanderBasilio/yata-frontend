import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/services/analytics/analytics.service';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { AppNoticesComponent } from './shared/components/app-notices/app-notices.component';
import { AppUpdateService } from './core/services/app-update/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNavComponent, AppNoticesComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('yata-frontend');
  private analyticsService = inject(AnalyticsService);
  private updates = inject(AppUpdateService);

  ngOnInit() {
    // Inicializar Google Analytics
    this.analyticsService.initialize();
    this.updates.initialize();
  }
}
