import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketOrderService } from '../../../../core/services/market/market-order.service';
import { MarketOrderResponse } from '../../../../core/models/market.model';

@Component({
  selector: 'app-market-order-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './market-order-confirmation.component.html',
  styleUrl: './market-order-confirmation.component.scss'
})
export class MarketOrderConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(MarketOrderService);

  orderCode = signal<string>('');
  order = signal<MarketOrderResponse | null>(null);
  isLoading = signal<boolean>(true);
  isCopied = signal<boolean>(false);

  // Status and payment method computeds
  isCashOnDelivery = computed(() => {
    const o = this.order();
    return o?.paymentMethod === 'CASH_ON_DELIVERY';
  });

  isPrepaid = computed(() => {
    const o = this.order();
    const pm = o?.paymentMethod;
    return pm === 'PREPAID' || pm === 'MANUAL_TRANSFER' || pm === 'YAPE' || pm === 'PLIN' || pm === 'TRANSFER';
  });

  isVerifyingPayment = computed(() => {
    const o = this.order();
    return o?.status === 'PAYMENT_VERIFICATION' || o?.paymentStatus === 'VERIFYING';
  });

  isConfirmed = computed(() => {
    const o = this.order();
    const s = o?.status;
    return s === 'CONFIRMED' || s === 'PREPARING' || s === 'COLLECTING' || s === 'READY_FOR_DELIVERY' || s === 'IN_DELIVERY';
  });

  isPendingPayment = computed(() => {
    const o = this.order();
    return o?.status === 'PENDING_PAYMENT' || o?.status === 'CREATED';
  });

  // Banner Informativo de Pesaje (Obligatorio si hay productos al peso)
  // Evaluar si algún producto tiene pricingMode === "WEIGHT_BASED" o weightStatus === "ESTIMATED"
  hasWeightBasedProducts = computed(() => {
    const o = this.order();
    if (!o) return false;
    if (o.hasWeightBasedProducts) return true;
    if (o.pricingMode === 'WEIGHT_BASED' || o.weightStatus === 'ESTIMATED') return true;

    // Direct items check
    if (o.items && o.items.some(i => i.pricingMode === 'WEIGHT_BASED' || i.weightStatus === 'ESTIMATED' || i.selectedMeasurement === 'KG')) {
      return true;
    }

    // Suborders items check
    if (o.suborders) {
      for (const sub of o.suborders) {
        if (sub.items && sub.items.some(i => i.pricingMode === 'WEIGHT_BASED' || i.weightStatus === 'ESTIMATED' || i.selectedMeasurement === 'KG')) {
          return true;
        }
      }
    }

    return false;
  });

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('orderCode') || '';
    this.orderCode.set(code);

    if (code) {
      this.orderService.getOrderByCode(code).subscribe({
        next: (data) => {
          this.order.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }

  copyOrderCode(): void {
    const code = this.orderCode();
    if (code && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2500);
      });
    }
  }

  resumePayment(): void {
    const code = this.orderCode();
    if (code) {
      this.router.navigate(['/checkout/market/orders', code, 'payment']);
    }
  }

  goToMarket(): void {
    this.router.navigate(['/market']);
  }

  goToMyOrders(): void {
    this.router.navigate(['/orders']);
  }
}
