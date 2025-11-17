import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../../core/services/cart/cart.service';
import { Product } from '../../../../core/services/product/product.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  product = input.required<Product>();

  // Signal para mostrar feedback visual
  showFeedback = signal(false);

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

  constructor(private cartService: CartService) {}

  onAddToCart(event: Event) {
    event.stopPropagation(); // Evitar propagación si la card es clickeable

    const productData = this.product();

    this.cartService.addItem({
      id: productData.id,
      name: productData.name,
      price: productData.price,
      image: productData.imageUrl,
      unit: productData.unit
    });

    // Mostrar feedback visual
    this.showFeedback.set(true);
    setTimeout(() => {
      this.showFeedback.set(false);
    }, 600);
  }
}
