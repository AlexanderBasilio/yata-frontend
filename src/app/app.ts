import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/services/analytics/analytics.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('yata-frontend');
  private analyticsService = inject(AnalyticsService);

  ngOnInit() {
    // Inicializar Google Analytics
    this.analyticsService.initialize();
  }
}
