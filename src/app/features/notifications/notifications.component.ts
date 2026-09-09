import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PortalNotificationService } from '../../core/services/portal/portal-notification.service';
import { NotificationResponse } from '../../core/models/portal-notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(PortalNotificationService);
  private router = inject(Router);

  notifications = signal<NotificationResponse[]>([]);
  isLoading = signal(true);
  filterUnreadOnly = signal(false);
  isMarkingAll = signal(false);

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading.set(true);
    this.notificationService.getMyInbox(this.filterUnreadOnly(), 0, 30).subscribe({
      next: (page) => {
        this.notifications.set(page?.content || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.isLoading.set(false);
      }
    });
  }

  setFilter(unreadOnly: boolean) {
    this.filterUnreadOnly.set(unreadOnly);
    this.loadNotifications();
  }

  onNotificationClick(item: NotificationResponse) {
    // Si no está leída, marcarla
    if (!item.isRead) {
      item.isRead = true;
      this.notificationService.markAsRead(item.uuid).subscribe();
    }

    // Redirección contextual según referencia o acción
    if (item.reference?.type === 'REWARD' || item.type === 'REWARD_PENDING') {
      this.router.navigate(['/rewards']);
    } else if (item.reference?.type === 'SURVEY' || item.type === 'SURVEY_INVITATION') {
      if (item.reference?.id) {
        this.router.navigate(['/surveys', item.reference.id]);
      } else {
        this.router.navigate(['/surveys']);
      }
    } else if (item.reference?.type === 'ORDER') {
      this.router.navigate(['/orders']);
    }
  }

  markAllAsRead() {
    if (this.isMarkingAll()) return;
    this.isMarkingAll.set(true);
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.isMarkingAll.set(false);
        const updated = this.notifications().map(n => ({ ...n, isRead: true }));
        this.notifications.set(updated);
        if (this.filterUnreadOnly()) {
          this.notifications.set([]);
        }
      },
      error: () => {
        this.isMarkingAll.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'Hace un momento' : `Hace ${diffMins} min`;
      }
      if (diffHours < 24) {
        return `Hace ${diffHours} h`;
      }
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
