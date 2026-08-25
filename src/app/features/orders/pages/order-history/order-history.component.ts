import { Component, inject, OnInit, signal, computed } from '@angular/core';
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

  // 🎯 Pestañas / Filtro de estados
  selectedTab = signal<string>('ALL');

  filteredOrders = computed(() => {
    const tab = this.selectedTab();
    const all = this.orders();
    if (tab === 'ALL') return all;
    return all.filter(o => o.status === tab);
  });

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
        return { label: 'Falta pagar', color: 'text-[#D97706]', bg: 'bg-[#D97706]/20', action: true };
      case 'WAITING_APPROVAL':
        return { label: 'Pago en revisión', color: 'text-[#0284C7]', bg: 'bg-[#0284C7]/20', action: false };
      case 'PAYMENT_CONFIRMED':
        return { label: 'Nuevo', color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/20', action: false };
      case 'PREPARING':
        return { label: 'Cocinando', color: 'text-[#C30364]', bg: 'bg-[#C30364]/20', action: false };
      case 'READY_FOR_PICKUP':
        return { label: 'Listo para Recoger', color: 'text-[#A855F7]', bg: 'bg-[#A855F7]/20', action: false };
      case 'ON_THE_WAY':
        return { label: 'En Camino', color: 'text-[#0284C7]', bg: 'bg-[#0284C7]/20', action: false };
      case 'DELIVERED':
        return { label: 'Entregado', color: 'text-[#D97706]', bg: 'bg-[#D97706]/20', action: false };
      case 'CONFIRMED_BY_CLIENT':
        return { label: 'Completado (Cliente)', color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/20', action: false };
      case 'CONFIRMED_BY_SYSTEM':
        return { label: 'Completado (Auto)', color: 'text-[#15803D]', bg: 'bg-[#15803D]/20', action: false };
      case 'REJECTED_BY_RESTAURANT':
        return { label: 'Rechazado', color: 'text-[#DC2626]', bg: 'bg-[#DC2626]/20', action: false };
      case 'CANCELLED':
        return { label: 'Cancelado', color: 'text-[#4B5563]', bg: 'bg-[#4B5563]/20', action: false };
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
