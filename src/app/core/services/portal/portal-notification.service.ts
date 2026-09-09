import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { 
  NotificationResponse, 
  UnreadCountResponse, 
  RestPageResponse 
} from '../../models/portal-notification.model';

@Injectable({
  providedIn: 'root'
})
export class PortalNotificationService {
  private http = inject(HttpClient);

  private get portalApiUrl(): string {
    return environment.portalUrl || 'https://zisify-portal-production-b174.up.railway.app/api/v1';
  }

  /**
   * 📬 GET /api/v1/portal/notifications/me
   * Bandeja de notificaciones paginada
   */
  getMyInbox(unreadOnly: boolean = false, page: number = 0, size: number = 20): Observable<RestPageResponse<NotificationResponse>> {
    let params = new HttpParams()
      .set('unread_only', unreadOnly.toString())
      .set('page', page.toString())
      .set('size', size.toString());

    const url = `${this.portalApiUrl}/portal/notifications/me`;
    return this.http.get<RestPageResponse<NotificationResponse>>(url, { params }).pipe(
      catchError(err => {
        console.warn('⚠️ Error al obtener buzón de notificaciones:', err);
        return of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: size,
          number: page,
          first: true,
          last: true,
          empty: true
        });
      })
    );
  }

  /**
   * 🔔 GET /api/v1/portal/notifications/me/unread-count
   * Contador ligero de notificaciones no leídas para badges y polling
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    const url = `${this.portalApiUrl}/portal/notifications/me/unread-count`;
    return this.http.get<UnreadCountResponse>(url).pipe(
      catchError(err => {
        console.warn('⚠️ Error al obtener unread-count de notificaciones:', err);
        return of({ unreadCount: 0 });
      })
    );
  }

  /**
   * 👁️ PATCH /api/v1/portal/notifications/{uuid}/read
   * Marcar notificación individual como leída
   */
  markAsRead(notificationUuid: string): Observable<void> {
    const url = `${this.portalApiUrl}/portal/notifications/${notificationUuid}/read`;
    return this.http.patch<void>(url, {});
  }

  /**
   * 🧹 PATCH /api/v1/portal/notifications/me/read-all
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead(): Observable<void> {
    const url = `${this.portalApiUrl}/portal/notifications/me/read-all`;
    return this.http.patch<void>(url, {});
  }
}
