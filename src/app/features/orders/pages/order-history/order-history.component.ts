import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../core/services/order/order.service';
import { PaymentStepperModalComponent } from '../../../../shared/components/payment-stepper-modal/payment-stepper-modal.component';
import {
  CustomerUnifiedOrderDto,
  CustomerUnifiedOrdersCountsDto,
  CustomerUnifiedOrderTabDto,
  CustomerUnifiedOrdersResponse
} from '../../../../core/models/unified-orders.model';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentStepperModalComponent, DecimalPipe],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss'
})
export class OrderHistoryComponent implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);

  // Nivel 1: Selector de Vertical ('ALL' | 'RESTAURANTS' | 'MARKET')
  selectedVertical = signal<'ALL' | 'RESTAURANTS' | 'MARKET'>('ALL');

  // Nivel 2: Filtro por Ciclo de Vida (Key de pestaña activa)
  selectedTab = signal<string>('ALL');

  // Datos del backend
  orders = signal<CustomerUnifiedOrderDto[]>([]);
  counts = signal<CustomerUnifiedOrdersCountsDto>({
    total: 0,
    restaurants: 0,
    market: 0,
    pendingPayment: 0,
    active: 0,
    completed: 0,
    cancelled: 0
  });
  statusTabs = signal<CustomerUnifiedOrderTabDto[]>([]);

  isLoading = signal<boolean>(true);
  isRefreshing = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Feedback de copiado de código
  copiedCode = signal<string | null>(null);

  // Stepper Modal de Pago para Restaurantes
  stepperOrder = signal<any | null>(null);
  showPaymentStepper = signal<boolean>(false);

  // Modal de Comprobante / Detalle
  selectedReceiptOrder = signal<CustomerUnifiedOrderDto | null>(null);
  showReceiptModal = signal<boolean>(false);

  // Confirmación de recepción y gamificación
  isConfirmingReceipt = signal<string | null>(null);
  showLoyaltySuccessModal = signal<boolean>(false);
  earnedPoints = signal<number>(0);
  earnedXp = signal<number>(0);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(showSpinner = true): void {
    if (showSpinner) {
      this.isLoading.set(true);
    } else {
      this.isRefreshing.set(true);
    }
    this.errorMessage.set(null);

    const vertical = this.selectedVertical();
    const tabKey = this.selectedTab();

    this.orderService.getUnifiedOrders(vertical, tabKey).subscribe({
      next: (res: CustomerUnifiedOrdersResponse) => {
        this.orders.set(res?.orders || []);
        if (res?.counts) {
          this.counts.set(res.counts);
        }
        if (res?.statusTabs && Array.isArray(res.statusTabs)) {
          this.statusTabs.set(res.statusTabs);
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar órdenes unificadas:', err);
        this.errorMessage.set('No fue posible cargar tus pedidos. Por favor intenta de nuevo.');
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  selectVertical(vertical: 'ALL' | 'RESTAURANTS' | 'MARKET'): void {
    if (this.selectedVertical() === vertical) return;
    this.selectedVertical.set(vertical);
    this.selectedTab.set('ALL');
    this.loadOrders(true);
  }

  selectTab(tabKey: string): void {
    if (this.selectedTab() === tabKey) return;
    this.selectedTab.set(tabKey);
    this.loadOrders(true);
  }

  copyCode(code: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!code) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.copiedCode.set(code);
        setTimeout(() => {
          if (this.copiedCode() === code) {
            this.copiedCode.set(null);
          }
        }, 2200);
      }).catch(err => {
        console.warn('Error al copiar al portapapeles:', err);
      });
    }
  }

  // --- ACCIONES CONTEXTUALES DE LAS ÓRDENES ---

  handlePayNow(order: CustomerUnifiedOrderDto): void {
    if (order.vertical === 'MARKET') {
      const url = order.paymentActionUrl || `/checkout/market/orders/${order.orderCode}/payment`;
      this.router.navigateByUrl(url);
    } else {
      // Para restaurantes abrimos el Stepper Modal de pago probado y funcionando
      this.stepperOrder.set(order);
      this.showPaymentStepper.set(true);
    }
  }

  handleTrackOrder(order: CustomerUnifiedOrderDto): void {
    if (order.trackingUrl) {
      if (order.trackingUrl.startsWith('http')) {
        window.open(order.trackingUrl, '_blank');
      } else {
        this.router.navigateByUrl(order.trackingUrl);
      }
      return;
    }

    if (order.vertical === 'MARKET') {
      this.router.navigate(['/market/order', order.orderCode]);
    } else {
      alert(`Tu pedido ${order.orderCode} en ${order.businessName || 'el restaurante'} está en camino/preparación.`);
    }
  }

  handleReorder(order: CustomerUnifiedOrderDto): void {
    if (order.vertical === 'MARKET') {
      this.router.navigate(['/market']);
    } else {
      this.router.navigate(['/food']);
    }
  }

  handleViewReceipt(order: CustomerUnifiedOrderDto): void {
    if (order.vertical === 'MARKET') {
      this.router.navigate(['/market/order', order.orderCode]);
    } else {
      this.selectedReceiptOrder.set(order);
      this.showReceiptModal.set(true);
    }
  }

  closeReceiptModal(): void {
    this.showReceiptModal.set(false);
    this.selectedReceiptOrder.set(null);
  }

  // Confirmación de Recepción (DELIVERED -> CONFIRMED_BY_CLIENT + Gamificación)
  confirmOrderReceipt(order: CustomerUnifiedOrderDto): void {
    if (!order || !order.orderCode) return;
    this.isConfirmingReceipt.set(order.orderCode);

    this.orderService.confirmReceipt(order.orderCode).subscribe({
      next: () => {
        const points = order.estimatedLoyaltyPoints || Math.round((order.totalAmount || 0) * 10);
        const xp = points * 10;
        this.earnedPoints.set(points);
        this.earnedXp.set(xp);

        this.showLoyaltySuccessModal.set(true);

        this.orders.update(orders =>
          orders.map(o =>
            o.orderCode === order.orderCode
              ? {
                  ...o,
                  status: 'CONFIRMED_BY_CLIENT',
                  statusLabel: 'Completado (Cliente)',
                  statusColor: 'emerald',
                  statusGroup: 'COMPLETED'
                }
              : o
          )
        );

        this.isConfirmingReceipt.set(null);
        this.loadOrders(false);
      },
      error: (error) => {
        console.error('Error al confirmar recepción de la orden:', error);
        alert('Hubo un error al confirmar la recepción. Por favor, intenta de nuevo.');
        this.isConfirmingReceipt.set(null);
      }
    });
  }

  closeLoyaltySuccessModal(): void {
    this.showLoyaltySuccessModal.set(false);
  }

  // --- MÉTODOS STEPPER DE PAGO RESTAURANTE ---
  openPaymentStepper(order: any): void {
    this.stepperOrder.set(order);
    this.showPaymentStepper.set(true);
  }

  closePaymentStepper(): void {
    this.showPaymentStepper.set(false);
    this.stepperOrder.set(null);
  }

  onPaymentCompleted(updatedOrder: any): void {
    this.loadOrders(false);
  }

  // --- HELPERS VISUALES ---

  isPendingPaymentTab(tab: CustomerUnifiedOrderTabDto): boolean {
    return (tab.key === 'PENDING_PAYMENT' || tab.key === 'CREATED') && tab.count > 0;
  }

  getTabIcon(key: string): string {
    switch (key) {
      case 'ALL':
        return '📋';
      case 'PENDING_PAYMENT':
      case 'CREATED':
        return '⚡';
      case 'PREPARING':
        return '🍳';
      case 'COLLECTING':
        return '🧺';
      case 'READY_FOR_PICKUP':
        return '🛍️';
      case 'READY_FOR_DELIVERY':
        return '📦';
      case 'ON_THE_WAY':
      case 'IN_DELIVERY':
        return '🛵';
      case 'ACTIVE':
        return '⏱️';
      case 'COMPLETED':
        return '✅';
      case 'CANCELLED':
        return '❌';
      default:
        return '📌';
    }
  }

  isEnCurso(order: CustomerUnifiedOrderDto): boolean {
    const active = [
      'PREPARING',
      'ACCEPTED_BY_RESTAURANT',
      'COLLECTING',
      'CONFIRMED',
      'READY_FOR_PICKUP',
      'READY_FOR_DELIVERY',
      'ON_THE_WAY',
      'IN_DELIVERY'
    ];
    return order.statusGroup === 'ACTIVE' || active.includes(order.status);
  }

  isCompleted(order: CustomerUnifiedOrderDto): boolean {
    const completed = ['CONFIRMED_BY_CLIENT', 'CONFIRMED_BY_SYSTEM', 'DELIVERED', 'COMPLETED'];
    return order.statusGroup === 'COMPLETED' || completed.includes(order.status);
  }

  getStatusBadgeClasses(color?: string): { bg: string; text: string; border: string } {
    switch (color?.toLowerCase()) {
      case 'amber':
      case 'orange':
      case 'yellow':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-300',
          border: 'border-amber-500/30'
        };
      case 'blue':
      case 'sky':
      case 'cyan':
        return {
          bg: 'bg-sky-500/15',
          text: 'text-sky-300',
          border: 'border-sky-500/30'
        };
      case 'purple':
      case 'violet':
      case 'fuchsia':
        return {
          bg: 'bg-purple-500/15',
          text: 'text-purple-300',
          border: 'border-purple-500/30'
        };
      case 'emerald':
      case 'green':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-300',
          border: 'border-emerald-500/30'
        };
      case 'red':
      case 'rose':
        return {
          bg: 'bg-red-500/15',
          text: 'text-red-300',
          border: 'border-red-500/30'
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-500/15',
          text: 'text-indigo-300',
          border: 'border-indigo-500/30'
        };
      default:
        return {
          bg: 'bg-[#31204F]',
          text: 'text-[#9D96A8]',
          border: 'border-[#432D6A]'
        };
    }
  }

  formatOrderDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timeStr = date.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      if (isToday) {
        return `Hoy, ${timeStr}`;
      }
      if (isYesterday) {
        return `Ayer, ${timeStr}`;
      }

      const dayMonth = date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short'
      });
      return `${dayMonth}, ${timeStr}`;
    } catch {
      return dateStr;
    }
  }

  goToCatalog(): void {
    if (this.selectedVertical() === 'MARKET') {
      this.router.navigate(['/market']);
    } else if (this.selectedVertical() === 'RESTAURANTS') {
      this.router.navigate(['/food']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
