import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourierSchedule } from '../../models/courier.model';
import { COURIER_CONFIG } from '../../config/courier.config';

export interface DateOption {
  value: string; // YYYY-MM-DD
  label: string; // 'Hoy, 27 Oct' o 'Mañana, 28 Oct'
  dayName: string;
  isToday: boolean;
  isPastCutoff: boolean;
}

@Component({
  selector: 'app-courier-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './courier-schedule.component.html',
  styleUrl: './courier-schedule.component.scss'
})
export class CourierScheduleComponent implements OnInit {
  readonly config = COURIER_CONFIG;

  @Input() set initialSchedule(val: CourierSchedule | null | undefined) {
    if (val) {
      this.selectedDateValue.set(val.date);
    }
  }

  @Output() scheduleChange = new EventEmitter<CourierSchedule>();

  selectedDateValue = signal<string>('');
  dateOptions = signal<DateOption[]>([]);

  // Indica si la fecha seleccionada corresponde a una reserva tardía (hoy después de las 9:45 a. m.)
  selectedDateMeta = computed(() => {
    return this.dateOptions().find(d => d.value === this.selectedDateValue());
  });

  isLateBooking = computed(() => {
    const meta = this.selectedDateMeta();
    return !!meta?.isToday && !!meta?.isPastCutoff;
  });

  ngOnInit(): void {
    this.generateDateOptions();
  }

  private generateDateOptions(): void {
    const options: DateOption[] = [];
    const now = new Date();

    // Días de la semana en español
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

    // Hora actual para evaluar el cutoff de las 9:45 a. m.
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isPastCutoffToday = (currentHour > COURIER_CONFIG.cutoffHour) ||
      (currentHour === COURIER_CONFIG.cutoffHour && currentMinute >= COURIER_CONFIG.cutoffMinute);

    // Generar opciones para los próximos 4 días laborables (saltando domingos)
    let added = 0;
    let dayOffset = 0;

    while (added < 4 && dayOffset < 8) {
      const target = new Date();
      target.setDate(now.getDate() + dayOffset);

      const dayOfWeek = target.getDay(); // 0 = Domingo
      if (dayOfWeek !== 0) { // Omitir domingos
        const year = target.getFullYear();
        const month = String(target.getMonth() + 1).padStart(2, '0');
        const day = String(target.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let label = '';
        if (dayOffset === 0) {
          label = `Hoy (${target.getDate()} ${months[target.getMonth()]})`;
        } else if (dayOffset === 1) {
          label = `Mañana (${target.getDate()} ${months[target.getMonth()]})`;
        } else {
          label = `${days[dayOfWeek]} ${target.getDate()} ${months[target.getMonth()]}`;
        }

        options.push({
          value: dateStr,
          label,
          dayName: days[dayOfWeek],
          isToday: dayOffset === 0,
          isPastCutoff: dayOffset === 0 ? isPastCutoffToday : false
        });

        added++;
      }
      dayOffset++;
    }

    this.dateOptions.set(options);

    // Si no hay fecha seleccionada o no es válida:
    // Si hoy ya pasó el mediodía (12:00 pm), por defecto preseleccionar mañana para mejor UX
    const isPastNoonToday = currentHour >= 12;
    if (!this.selectedDateValue()) {
      if (isPastNoonToday && options.length > 1) {
        this.selectDate(options[1].value);
      } else if (options.length > 0) {
        this.selectDate(options[0].value);
      }
    }
  }

  selectDate(dateValue: string): void {
    this.selectedDateValue.set(dateValue);
    this.emitChange();
  }

  switchToTomorrow(): void {
    const tomorrow = this.dateOptions().find(d => !d.isToday);
    if (tomorrow) {
      this.selectDate(tomorrow.value);
    }
  }

  private emitChange(): void {
    const meta = this.selectedDateMeta();
    const schedule: CourierSchedule = {
      date: this.selectedDateValue(),
      dateLabel: meta?.label || this.selectedDateValue(),
      window: COURIER_CONFIG.collectionWindow,
      isLateBooking: this.isLateBooking(),
      cutoffTimeNoticeAcknowledged: true
    };
    this.scheduleChange.emit(schedule);
  }
}
