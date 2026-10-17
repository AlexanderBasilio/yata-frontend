import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketOrderService } from '../../../../core/services/market/market-order.service';
import { MarketOrderResponse, ZoneResolutionResponse } from '../../../../core/models/market.model';

@Component({
  selector: 'app-market-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './market-payment.component.html',
  styleUrl: './market-payment.component.scss'
})
export class MarketPaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(MarketOrderService);

  orderCode = signal<string>('');
  order = signal<MarketOrderResponse | null>(null);
  zoneInfo = signal<ZoneResolutionResponse | null>(null);
  isLoading = signal<boolean>(true);
  isUpdating = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Selected payment method: 'PREPAID' | 'CASH_ON_DELIVERY'
  selectedMethod = signal<'PREPAID' | 'CASH_ON_DELIVERY'>('PREPAID');

  // Computed availability
  isPrepaidEnabled = computed(() => {
    const zone = this.zoneInfo();
    if (!zone) return true; // Por defecto habilitado
    return zone.prepaidEnabled !== false && zone.bankTransferEnabled !== false;
  });

  isCashOnDeliveryEnabled = computed(() => {
    const zone = this.zoneInfo();
    if (!zone) return true;
    return zone.cashOnDeliveryEnabled === true;
  });

  readonly zisifyPhone = '51987654321';

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('orderCode') || '';
    this.orderCode.set(code);

    if (!code) {
      this.errorMessage.set('No se encontró el código de orden.');
      this.isLoading.set(false);
      return;
    }

    this.loadOrderAndZone(code);
  }

  private loadOrderAndZone(code: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.orderService.getOrderByCode(code).subscribe({
      next: (order) => {
        if (!order) {
          this.errorMessage.set(`No se pudo cargar la información de la orden ${code}.`);
          this.isLoading.set(false);
          return;
        }

        this.order.set(order);

        // Si la orden ya trae coordenadas de entrega, resolver zona en Platform
        const loc = order.deliveryLocation || order.location;
        if (loc?.latitude && loc?.longitude) {
          this.orderService.resolveZoneLocation(loc.latitude, loc.longitude).subscribe({
            next: (zone) => {
              this.zoneInfo.set(zone);
              this.adjustDefaultMethod(zone);
              this.isLoading.set(false);
            },
            error: () => {
              this.isLoading.set(false);
            }
          });
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Error al consultar la orden.');
      }
    });
  }

  private adjustDefaultMethod(zone: ZoneResolutionResponse): void {
    if (zone.cashOnDeliveryEnabled === false && this.selectedMethod() === 'CASH_ON_DELIVERY') {
      this.selectedMethod.set('PREPAID');
    }
  }

  selectMethod(method: 'PREPAID' | 'CASH_ON_DELIVERY'): void {
    if (method === 'CASH_ON_DELIVERY' && !this.isCashOnDeliveryEnabled()) {
      return;
    }
    this.selectedMethod.set(method);
  }

  confirmPaymentMethod(): void {
    const code = this.orderCode();
    if (!code) return;

    this.isUpdating.set(true);
    this.errorMessage.set(null);

    const method = this.selectedMethod();

    this.orderService.updatePaymentMethod(code, method).subscribe({
      next: () => {
        this.isUpdating.set(false);
        // Redirigir a pantalla de confirmación / voucher
        this.router.navigate(['/market/order', code]);
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.errorMessage.set(
          err?.error?.message || 'No fue posible registrar el método de pago seleccionado. Por favor intenta de nuevo.'
        );
      }
    });
  }

  goBackToCatalog(): void {
    this.router.navigate(['/market']);
  }
}
