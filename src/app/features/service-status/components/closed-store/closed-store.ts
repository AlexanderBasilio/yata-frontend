import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { StoreHoursService } from '../../../../core/services/store/store-hours.service';
import { ServiceAccessService } from '../../../../core/services/store/service-access.service';
import { ServiceUnavailableComponent } from './service-unavailable.component';
import { TeamAccessComponent } from './team-access.component';

@Component({
  selector: 'app-closed-store',
  standalone: true,
  imports: [CommonModule, ServiceUnavailableComponent, TeamAccessComponent],
  templateUrl: './closed-store.html',
  styleUrl: './closed-store.scss'
})
export class ClosedStoreComponent implements OnInit, OnDestroy {
  readonly backendAccessEnabled = inject(ServiceAccessService).enabled;
  currentTime = signal<string>('');
  isOpen = signal<boolean>(false);
  openingTime = signal<string>('');
  closingTime = signal<string>('');
  timeUntilOpen = signal<string>('');

  private timeSubscription?: Subscription;

  constructor(
    private router: Router,
    private storeHoursService: StoreHoursService
  ) {}

  ngOnInit(): void {
    if (this.backendAccessEnabled) return;
    this.updateTime();
    // Actualizar cada minuto
    this.timeSubscription = interval(60000).subscribe(() => {
      this.updateTime();
    });
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  public updateTime(): void {
    const now = new Date();
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));

    const currentTimeString = this.storeHoursService.getCurrentTimeInPeru();
    this.currentTime.set(currentTimeString);

    const isCurrentlyOpen = this.storeHoursService.isOpen();
    this.isOpen.set(isCurrentlyOpen);

    const hours = this.storeHoursService.getStoreHours();
    this.openingTime.set(this.formatTime(hours.open));
    this.closingTime.set(this.formatTime(hours.close));

    console.log('⏰ Hora actual Peru:', currentTimeString);
    console.log('🏪 Horario apertura:', hours.open);
    console.log('🏪 Horario cierre:', hours.close);
    console.log('❓ Está abierto:', isCurrentlyOpen);

    // Si la tienda está abierta, redirigir al catálogo
    if (isCurrentlyOpen) {
      console.log('🎉 ¡Tienda abierta! Redirigiendo al catálogo...');
      setTimeout(() => {
        this.router.navigate(['/catalog']);
      }, 500);
      return;
    }

    // Si está cerrada, calcular tiempo hasta apertura
    const timeUntil = this.calculateTimeUntilOpen(peruTime, hours.open);
    console.log('⏳ Tiempo hasta apertura:', timeUntil);
    this.timeUntilOpen.set(timeUntil);
    console.log('✅ Signal timeUntilOpen:', this.timeUntilOpen());
  }

  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  private calculateTimeUntilOpen(currentDate: Date, openTime: string): string {
    const [openHour, openMinute] = openTime.split(':').map(Number);

    const openingDate = new Date(currentDate);
    openingDate.setHours(openHour, openMinute, 0, 0);

    // Si ya pasó la hora de apertura de hoy, calcular para mañana
    if (currentDate >= openingDate) {
      openingDate.setDate(openingDate.getDate() + 1);
    }

    const diff = openingDate.getTime() - currentDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''} y ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
  }

  getDayOfWeek(): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const peruTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
    return days[peruTime.getDay()];
  }
}
