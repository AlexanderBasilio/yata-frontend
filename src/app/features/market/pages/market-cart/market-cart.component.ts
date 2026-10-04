import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MarketCartService } from '../../../../core/services/market/market-cart.service';
import { MarketCartItemDto, MarketCartStoreGroupDto } from '../../../../core/models/market.model';
import { ProximityConflictModalComponent } from '../../components/proximity-conflict-modal/proximity-conflict-modal.component';

@Component({
  selector: 'app-market-cart',
  standalone: true,
  imports: [CommonModule, ProximityConflictModalComponent],
  templateUrl: './market-cart.component.html'
})
export class MarketCartComponent implements OnInit {
  private router = inject(Router);
  public cartService = inject(MarketCartService);

  cart = computed(() => this.cartService.cart());
  isEmpty = computed(() => !this.cart() || (this.cart()?.totalItemsCount ?? 0) === 0);

  ngOnInit() {
    this.cartService.getCart().subscribe();
  }

  onUpdateQuantity(item: MarketCartItemDto, change: number) {
    const isKg = item.selectedMeasurement === 'KG';
    const step = isKg ? (change > 0 ? 0.5 : -0.5) : (change > 0 ? 1 : -1);
    const newQty = isKg ? +(item.quantity + step).toFixed(1) : item.quantity + step;
    if (newQty <= 0) {
      this.onRemoveItem(item);
    } else {
      this.cartService.updateItemQuantity(item.itemId, newQty).subscribe();
    }
  }

  onRemoveItem(item: MarketCartItemDto) {
    if (confirm(`¿Deseas eliminar "${item.productName}" del carrito?`)) {
      this.cartService.removeItem(item.itemId).subscribe();
    }
  }

  onClearCart() {
    if (confirm('¿Estás seguro de que deseas vaciar todo el carrito de mercado?')) {
      this.cartService.clearCart().subscribe();
    }
  }

  goBack() {
    this.router.navigate(['/market']);
  }

  goToMarket() {
    this.router.navigate(['/market']);
  }

  proceedToCheckout() {
    this.router.navigate(['/market/checkout']);
  }
}
