import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../../../core/services/cart/cart.service';

@Component({
  selector: 'app-cart-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-view.component.html',
  styleUrl: './cart-view.component.scss'
})
export class CartViewComponent {
  items = computed(() => this.cartService.items());
  total = computed(() => this.cartService.total());
  itemCount = computed(() => this.cartService.itemCount());

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  increaseQuantity(productId: string): void {
    this.cartService.increaseQuantity(productId);
  }

  decreaseQuantity(productId: string): void {
    this.cartService.decreaseQuantity(productId);
  }

  removeItem(productId: string): void {
    this.cartService.removeItem(productId);
  }

  clearCart(): void {
    if (confirm('¿Estás seguro de vaciar el carrito?')) {
      this.cartService.clearCart();
    }
  }

  goToCheckout(): void {
    if (this.itemCount() === 0) {
      alert('Tu carrito está vacío');
      return;
    }
    this.router.navigate(['/location']);
  }

  goBack(): void {
    this.router.navigate(['/catalog']);
  }
}
