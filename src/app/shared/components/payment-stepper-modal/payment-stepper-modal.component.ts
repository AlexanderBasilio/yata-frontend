import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order/order.service';
import { OrderResponse } from '../../../core/models/order.model';

@Component({
  selector: 'app-payment-stepper-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-stepper-modal.component.html',
  styleUrl: './payment-stepper-modal.component.scss'
})
export class PaymentStepperModalComponent implements OnInit {
  private orderService = inject(OrderService);

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

  ngOnInit(): void {
    this.currentStep.set(this.initialStep);

    if (this.orderData) {
      this.order.set(this.orderData);
    } else if (this.orderCode) {
      this.fetchOrderDetails(this.orderCode);
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
    this.errorMessage.set('');
    this.currentStep.set(step);
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
        this.order.set(updatedOrder);
        this.isSubmitting.set(false);
        this.paymentCompleted.emit(updatedOrder);
        this.currentStep.set(3);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error reportando pago:', err);
        this.errorMessage.set(err?.error?.message || 'No se pudo registrar el pago. Verifica el número de operación.');
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }
}
