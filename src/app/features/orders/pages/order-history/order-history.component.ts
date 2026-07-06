import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../core/services/order/order.service';
import { OrderResponse, OrderStatus } from '../../../../core/models/order.model';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss'
})
export class OrderHistoryComponent implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);

  orders = signal<OrderResponse[]>([]);
  isLoading = signal(true);

  // Para el modal de reporte de pago
  reportingOrder = signal<OrderResponse | null>(null);
  operationNumber = signal<string>('');
  isReporting = signal(false);

  // Para el modal de la Guía de Pago
  showGuideModal = signal(false);
  activeGuideOrder = signal<OrderResponse | null>(null);
  showExampleImage = signal(false);

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
      case 'CANCELLED':
      case 'REJECTED_BY_RESTAURANT':
        return { label: 'Cancelado', color: 'text-rose-400', bg: 'bg-rose-500/20', action: false };
      default:
        return { label: 'Creado', color: 'text-[#9D96A8]', bg: 'bg-[#31204F]', action: false };
    }
  }

  openPaymentReport(order: OrderResponse) {
    this.reportingOrder.set(order);
    this.operationNumber.set('');
  }

  closePaymentReport() {
    this.reportingOrder.set(null);
    this.operationNumber.set('');
  }

  submitPaymentReport() {
    const order = this.reportingOrder();
    if (!order) return;

    if (!this.operationNumber() || this.operationNumber().trim() === '') {
      alert('Debes ingresar el número de operación');
      return;
    }

    this.isReporting.set(true);
    this.orderService.reportPayment(order.orderCode, { operationNumber: this.operationNumber() })
      .subscribe({
        next: (updatedOrder) => {
          this.orders.update(orders => orders.map(o => o.orderCode === updatedOrder.orderCode ? updatedOrder : o));
          this.closePaymentReport();
          this.isReporting.set(false);
        },
        error: (error) => {
          console.error('Error reportando pago', error);
          alert('Hubo un error al reportar el pago');
          this.isReporting.set(false);
        }
      });
  }

  openGuide(order: OrderResponse) {
    this.activeGuideOrder.set(order);
    this.showGuideModal.set(true);
    this.showExampleImage.set(false);
  }

  closeGuide() {
    this.showGuideModal.set(false);
    this.activeGuideOrder.set(null);
    this.showExampleImage.set(false);
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  yapeCopiedOrderCode: string | null = null;
  async copyCelular(orderCode: string) {
    try {
      await navigator.clipboard.writeText('963434580');
      this.yapeCopiedOrderCode = orderCode;
      setTimeout(() => {
        this.yapeCopiedOrderCode = null;
      }, 3000);
    } catch (err) {
      console.error('Error al copiar celular:', err);
      alert('No se pudo copiar el número automáticamente. El número es 963434580');
    }
  }
}
