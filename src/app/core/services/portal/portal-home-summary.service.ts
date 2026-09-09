import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HomeSummaryResponse } from '../../models/portal-home-summary.model';

@Injectable({
  providedIn: 'root'
})
export class PortalHomeSummaryService {
  private http = inject(HttpClient);

  private get portalApiUrl(): string {
    return environment.portalUrl || 'https://zisify-portal-production-b174.up.railway.app/api/v1';
  }

  /**
   * ⚡ GET /api/v1/portal/home/summary
   * Resumen ligero de cabecera y contadores para badges de notificaciones y recompensas
   */
  getHomeSummary(): Observable<HomeSummaryResponse | null> {
    const url = `${this.portalApiUrl}/portal/home/summary`;
    return this.http.get<HomeSummaryResponse>(url).pipe(
      tap(summary => {
        console.group('🏠 [GET HTTP] Home Summary recibido');
        console.log('📦 Summary:', summary);
        console.groupEnd();
      }),
      catchError(err => {
        console.warn('⚠️ Error al obtener Portal Home Summary:', err);
        return of(null);
      })
    );
  }
}
