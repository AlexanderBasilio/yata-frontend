import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart/cart.service';

@Component({
  selector: 'app-floating-cart-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-cart-button.component.html',
  styleUrl: './floating-cart-button.component.scss'
})
export class FloatingCartButtonComponent {
  itemCount = computed(() => this.cartService.itemCount());
  total = computed(() => this.cartService.total());

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}
