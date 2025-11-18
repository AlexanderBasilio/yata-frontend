import { Component, input, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../../core/services/cart/cart.service';
import { Product } from '../../../../core/services/product/product.service';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  product = input.required<Product>();
  showFeedback = signal(false);

  private cartService = inject(CartService);
  private analyticsService = inject(AnalyticsService);

  hasDiscount = computed(() => {
    const prod = this.product();
    return prod.oldPrice !== undefined &&
           prod.oldPrice !== null &&
           prod.oldPrice > prod.price;
  });

  formattedOldPrice = computed(() => {
    const oldPrice = this.product().oldPrice;
    return oldPrice ? oldPrice.toFixed(2) : '0.00';
  });

  onAddToCart(event: Event) {
    event.stopPropagation();

    const productData = this.product();

    // Agregar al carrito
    this.cartService.addItem({
      id: productData.id,
      name: productData.name,
      price: productData.price,
      image: productData.imageUrl,
      unit: productData.unit
    });

    // 📊 Rastrear en Google Analytics
    this.analyticsService.trackAddToCart(
      productData.id,
      productData.name,
      productData.price
    );

    // Feedback visual
    this.showFeedback.set(true);
    setTimeout(() => {
      this.showFeedback.set(false);
    }, 600);
  }
}
