import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../../core/services/cart/cart.service';

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  unit: string;
  description: string;
  pack: string;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})

export class ProductCardComponent {
  product = input.required<Product>();

  constructor(private cartService: CartService) {}

  onAddToCart() {
    this.cartService.addItem({
      id: this.product().id,
      name: this.product().name,
      price: this.product().price,
      image: this.product().image,
      unit: this.product().unit
    });
  }
}
