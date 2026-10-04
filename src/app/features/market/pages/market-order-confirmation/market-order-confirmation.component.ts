import { Component, OnInit, inject, signal } from '@angular/core';
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

  // Número oficial para comprobantes Zisify
  readonly zisifyPhone = '51987654321';

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

  getWhatsAppUrl(): string {
    const code = this.orderCode();
    const msg = encodeURIComponent(
      `Hola Zisify, adjunto el comprobante de pago de mi pedido de Mercado con código ${code}.`
    );
    return `https://wa.me/${this.zisifyPhone}?text=${msg}`;
  }

  goToMarket(): void {
    this.router.navigate(['/market']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
