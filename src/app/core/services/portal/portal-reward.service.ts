import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { 
  RewardResponse, 
  PendingRewardsCountResponse, 
  ClaimRewardResponse 
} from '../../models/portal-reward.model';
import { RestPageResponse } from '../../models/portal-notification.model';

@Injectable({
  providedIn: 'root'
})
export class PortalRewardService {
  private http = inject(HttpClient);

  private get portalApiUrl(): string {
    return environment.portalUrl || 'https://zisify-portal-production-b174.up.railway.app/api/v1';
  }

  /**
   * 🎁 GET /api/v1/portal/rewards/pending?page=0&size=20
   * Lista paginada de recompensas esperando ser cobradas
   */
  getPendingRewards(page: number = 0, size: number = 20): Observable<RestPageResponse<RewardResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    const url = `${this.portalApiUrl}/portal/rewards/pending`;
    return this.http.get<RestPageResponse<RewardResponse>>(url, { params }).pipe(
      catchError(err => {
        console.warn('⚠️ Error al obtener recompensas pendientes:', err);
        return of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size,
          number: page,
          first: true,
          last: true,
          empty: true
        });
      })
    );
  }

  /**
   * 📜 GET /api/v1/portal/rewards?status=CLAIMED&page=0&size=20
   * Historial de recompensas ya reclamadas o expiradas
   */
  getRewardsHistory(status: string = 'CLAIMED', page: number = 0, size: number = 20): Observable<RestPageResponse<RewardResponse>> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('size', size.toString());
    const url = `${this.portalApiUrl}/portal/rewards`;
    return this.http.get<RestPageResponse<RewardResponse>>(url, { params }).pipe(
      catchError(err => {
        console.warn('⚠️ Error al obtener historial de recompensas:', err);
        return of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size,
          number: page,
          first: true,
          last: true,
          empty: true
        });
      })
    );
  }

  /**
   * 🔢 GET /api/v1/portal/rewards/pending/count
   * Contador rápido de recompensas pendientes
   */
  getPendingCount(): Observable<PendingRewardsCountResponse> {
    const url = `${this.portalApiUrl}/portal/rewards/pending/count`;
    return this.http.get<PendingRewardsCountResponse>(url).pipe(
      catchError(err => {
        console.warn('⚠️ Error al obtener pending count de recompensas:', err);
        return of({ pendingCount: 0 });
      })
    );
  }

  /**
   * ⚡ POST /api/v1/portal/rewards/{rewardId}/claim
   * Reclamar recompensa individual y acreditar ZisiCoins y XP al balance
   */
  claimReward(rewardId: string | number): Observable<ClaimRewardResponse> {
    const url = `${this.portalApiUrl}/portal/rewards/${rewardId}/claim`;
    console.group('⚡ [POST HTTP] Reclamando Recompensa:', rewardId);
    console.groupEnd();
    return this.http.post<ClaimRewardResponse>(url, {});
  }
}
