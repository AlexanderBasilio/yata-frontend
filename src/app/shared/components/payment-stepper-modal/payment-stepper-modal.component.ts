import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order/order.service';
import { OrderResponse } from '../../../core/models/order.model';
import { AnalyticsService } from '../../../core/services/analytics/analytics.service';
import { AppUpdateService } from '../../../core/services/app-update/app-update.service';

@Component({
  selector: 'app-payment-stepper-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-stepper-modal.component.html',
  styleUrl: './payment-stepper-modal.component.scss'
})
export class PaymentStepperModalComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private analytics = inject(AnalyticsService);
  private updates = inject(AppUpdateService);
  private releaseUpdateHold?: () => void;

  @Input() orderCode: string | null = null;
  @Input() orderData: any = null;
  @Input() initialStep: 1 | 2 | 3 = 1;
  @Input() isModal: boolean = true;

  @Output() close = new EventEmitter<void>();
  @Output() paymentCompleted = new EventEmitter<any>();

  currentStep = signal<1 | 2 | 3>(1);
  order = signal<any>(null);

  operationNumber = signal<string>('');
  isValidOperationNumber = signal<boolean>(false);

  isSubmitting = signal<boolean>(false);
  celularCopied = signal<boolean>(false);
  orderCodeCopied = signal<boolean>(false);
  errorMessage = signal<string>('');

  // 🎧 Reproductor de Audio para Instrucciones de Pago
  private audioStep1: HTMLAudioElement | null = null;
  private audioStep2: HTMLAudioElement | null = null;
  isPlayingAudioStep1 = signal<boolean>(false);
  isPlayingAudioStep2 = signal<boolean>(false);

  private readonly AUDIO_STEP1_URL = 'https://pub-2e54587e86f24e2fbe36fcbb8f62dbe2.r2.dev/chekcout-instrucciones-audio-paso1.mp3';
  private readonly AUDIO_STEP2_URL = 'https://pub-2e54587e86f24e2fbe36fcbb8f62dbe2.r2.dev/chekcout-instrucciones-audio-paso2.mp3';

  ngOnInit(): void {
    this.releaseUpdateHold = this.updates.holdUpdates();
    this.currentStep.set(this.initialStep);
    this.analytics.trackPaymentStep(this.initialStep);

    if (this.orderData) {
      this.order.set(this.orderData);
    } else if (this.orderCode) {
      this.fetchOrderDetails(this.orderCode);
    }
  }

  ngOnDestroy(): void {
    this.releaseUpdateHold?.();
    this.stopAllAudio();
  }

  toggleAudioStep1(): void {
    if (this.isPlayingAudioStep1()) {
      this.stopAllAudio();
      return;
    }

    this.stopAllAudio();

    if (!this.audioStep1) {
      this.audioStep1 = new Audio(this.AUDIO_STEP1_URL);
      this.audioStep1.onended = () => this.isPlayingAudioStep1.set(false);
      this.audioStep1.onerror = (err) => {
        console.error('Error reproduciendo audio paso 1:', err);
        this.isPlayingAudioStep1.set(false);
      };
    }

    this.audioStep1.currentTime = 0;
    this.audioStep1.play().then(() => {
      this.isPlayingAudioStep1.set(true);
    }).catch(err => {
      console.warn('Auto-play bloqueado o error en audio:', err);
      this.isPlayingAudioStep1.set(false);
    });
  }

  toggleAudioStep2(): void {
    if (this.isPlayingAudioStep2()) {
      this.stopAllAudio();
      return;
    }

    this.stopAllAudio();

    if (!this.audioStep2) {
      this.audioStep2 = new Audio(this.AUDIO_STEP2_URL);
      this.audioStep2.onended = () => this.isPlayingAudioStep2.set(false);
      this.audioStep2.onerror = (err) => {
        console.error('Error reproduciendo audio paso 2:', err);
        this.isPlayingAudioStep2.set(false);
      };
    }

    this.audioStep2.currentTime = 0;
    this.audioStep2.play().then(() => {
      this.isPlayingAudioStep2.set(true);
    }).catch(err => {
      console.warn('Auto-play bloqueado o error en audio:', err);
      this.isPlayingAudioStep2.set(false);
    });
  }

  stopAllAudio(): void {
    if (this.audioStep1) {
      this.audioStep1.pause();
      this.audioStep1.currentTime = 0;
      this.isPlayingAudioStep1.set(false);
    }
    if (this.audioStep2) {
      this.audioStep2.pause();
      this.audioStep2.currentTime = 0;
      this.isPlayingAudioStep2.set(false);
    }
  }

  fetchOrderDetails(code: string): void {
    this.orderService.getMyOrders().subscribe({
      next: (orders: OrderResponse[]) => {
        const found = orders.find(o => o.orderCode === code || o.orderId === code);
        if (found) {
          this.order.set(found);
        }
      },
      error: (err: any) => {
        console.error('Error al cargar datos del pedido:', err);
      }
    });
  }

  goToStep(step: 1 | 2 | 3): void {
    this.stopAllAudio();
    this.errorMessage.set('');
    this.currentStep.set(step);
    this.analytics.trackPaymentStep(step);
  }

  onOperationNumberChange(val: string): void {
    const cleaned = (val || '').replace(/\D/g, '').slice(0, 8);
    this.operationNumber.set(cleaned);
    this.isValidOperationNumber.set(cleaned.length === 8);
  }

  async copyCelular(): Promise<void> {
    try {
      await navigator.clipboard.writeText('963434580');
      this.celularCopied.set(true);
      setTimeout(() => this.celularCopied.set(false), 3000);
    } catch (err) {
      console.error('Error al copiar celular:', err);
      alert('No se pudo copiar automáticamente. El número de Yape es 963434580');
    }
  }

  async copyOrderCode(): Promise<void> {
    const code = this.order()?.orderCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.orderCodeCopied.set(true);
      setTimeout(() => this.orderCodeCopied.set(false), 2000);
    } catch (err) {
      console.error('Error al copiar código:', err);
    }
  }

  submitPayment(): void {
    const currentOrder = this.order();
    const code = currentOrder?.orderCode || this.orderCode;

    if (!code || !this.isValidOperationNumber()) {
      this.errorMessage.set('Por favor ingresa los 8 dígitos del número de operación.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.orderService.reportPayment(code, { operationNumber: this.operationNumber() }).subscribe({
      next: (updatedOrder: OrderResponse) => {
        // Reporting a manual payment is NOT evidence of payment approval.
        this.analytics.trackPaymentReported();
        this.analytics.trackPaymentStep(3);
        this.order.set(updatedOrder);
        this.isSubmitting.set(false);
        this.paymentCompleted.emit(updatedOrder);
        this.currentStep.set(3);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.analytics.trackError('payment_report', err?.status);
        console.error('Error reportando pago:', err);
        this.errorMessage.set(err?.error?.message || 'No se pudo registrar el pago. Verifica el número de operación.');
      }
    });
  }

  closeModal(): void {
    this.stopAllAudio();
    this.close.emit();
  }
}
