import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../core/services/order/order.service';
import { OrderResponse, OrderStatus } from '../../../../core/models/order.model';
import { PaymentStepperModalComponent } from '../../../../shared/components/payment-stepper-modal/payment-stepper-modal.component';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentStepperModalComponent],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss'
})
export class OrderHistoryComponent implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);

  orders = signal<OrderResponse[]>([]);
  isLoading = signal(true);

  // Stepper Modal de Pago
  stepperOrder = signal<OrderResponse | null>(null);
  showPaymentStepper = signal<boolean>(false);

  // Para la confirmación de recepción y gamificación
  isConfirmingReceipt = signal<string | null>(null);
  showLoyaltySuccessModal = signal<boolean>(false);
  earnedPoints = signal<number>(0);
  earnedXp = signal<number>(0);

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading.set(true);
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading orders', error);
        this.isLoading.set(false);
      }
    });
  }

  getStatusConfig(status: OrderStatus) {
    switch (status) {
      case 'PENDING_PAYMENT':
        return { label: 'Falta pagar', color: 'text-amber-400', bg: 'bg-amber-500/20', action: true };
      case 'WAITING_APPROVAL':
        return { label: 'Pago en revisión', color: 'text-sky-400', bg: 'bg-sky-500/20', action: false };
      case 'PAYMENT_CONFIRMED':
        return { label: 'Pago verificado', color: 'text-emerald-400', bg: 'bg-emerald-500/20', action: false };
      case 'PREPARING':
        return { label: 'En preparación', color: 'text-[#C30364]', bg: 'bg-[#C30364]/20', action: false };
      case 'ON_THE_WAY':
        return { label: 'En camino', color: 'text-[#C30364]', bg: 'bg-[#C30364]/20', action: false };
      case 'READY_FOR_PICKUP':
        return { label: 'Listo para recoger', color: 'text-[#9D96A8]', bg: 'bg-[#31204F]', action: false };
      case 'DELIVERED':
        return { label: 'Entregado', color: 'text-[#9D96A8]', bg: 'bg-[#31204F]', action: false };
      case 'CONFIRMED_BY_CLIENT':
      case 'CONFIRMED_BY_SYSTEM':
        return { label: 'Recibido', color: 'text-emerald-400', bg: 'bg-emerald-500/20', action: false };
      case 'CANCELLED':
      case 'REJECTED_BY_RESTAURANT':
        return { label: 'Cancelado', color: 'text-rose-400', bg: 'bg-rose-500/20', action: false };
      default:
        return { label: 'Creado', color: 'text-[#9D96A8]', bg: 'bg-[#31204F]', action: false };
    }
  }

  // --- MÉTODOS STEPPER DE PAGO ---
  openPaymentStepper(order: OrderResponse) {
    this.stepperOrder.set(order);
    this.showPaymentStepper.set(true);
  }

  closePaymentStepper() {
    this.showPaymentStepper.set(false);
    this.stepperOrder.set(null);
  }

  onPaymentCompleted(updatedOrder: OrderResponse) {
    if (updatedOrder) {
      this.orders.update(orders =>
        orders.map(o => o.orderCode === updatedOrder.orderCode ? updatedOrder : o)
      );
    }
    this.loadOrders();
  }

  confirmOrderReceipt(order: OrderResponse) {
    if (!order || !order.orderCode) return;
    this.isConfirmingReceipt.set(order.orderCode);

    this.orderService.confirmReceipt(order.orderCode).subscribe({
      next: () => {
        const points = order.estimatedLoyaltyPoints || Math.round((order.subtotalAmount || 0) * 10);
        const xp = points * 10;
        this.earnedPoints.set(points);
        this.earnedXp.set(xp);

        this.showLoyaltySuccessModal.set(true);

        this.orders.update(orders =>
          orders.map(o => o.orderCode === order.orderCode ? { ...o, status: 'CONFIRMED_BY_CLIENT' as any } : o)
        );

        this.isConfirmingReceipt.set(null);
      },
      error: (error) => {
        console.error('Error al confirmar recepción de la orden:', error);
        alert('Hubo un error al confirmar la recepción. Por favor, intenta de nuevo.');
        this.isConfirmingReceipt.set(null);
      }
    });
  }

  closeLoyaltySuccessModal() {
    this.showLoyaltySuccessModal.set(false);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
