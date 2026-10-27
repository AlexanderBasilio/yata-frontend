import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourierQuoteFormState } from '../../models/courier.model';
import { COURIER_CONFIG } from '../../config/courier.config';
import { CourierWhatsappService } from '../../services/courier-whatsapp.service';

@Component({
  selector: 'app-courier-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './courier-summary.component.html',
  styleUrl: './courier-summary.component.scss'
})
export class CourierSummaryComponent {
  private whatsappService = inject(CourierWhatsappService);

  @Input({ required: true }) formState!: CourierQuoteFormState;
  @Input() isValid = false;
  @Input() validationErrors: string[] = [];

  @Output() submitToWhatsapp = new EventEmitter<void>();

  isOpening = signal<boolean>(false);

  get serviceTitle(): string {
    const meta = COURIER_CONFIG.serviceTypes.find(s => s.id === this.formState?.serviceType);
    return meta?.title || this.formState?.serviceType || 'Servicio estándar';
  }

  get sizeTitle(): string {
    const meta = COURIER_CONFIG.packageSizes.find(s => s.id === this.formState?.packageSpecs?.size);
    return meta?.title || this.formState?.packageSpecs?.size || 'Mediano';
  }

  onSubmit(): void {
    if (!this.isValid || this.isOpening()) return;

    this.isOpening.set(true);
    this.submitToWhatsapp.emit();

    // Pequeño debounce para evitar doble apertura accidental
    setTimeout(() => {
      this.isOpening.set(false);
    }, 2000);
  }
}
