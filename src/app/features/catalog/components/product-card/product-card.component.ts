import { Component, input, computed } from '@angular/core';
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
  // Usar la interfaz Product del servicio
  product = input.required<Product>();

  /**
   * Computed signal que verifica si el producto tiene descuento
   * Un producto tiene descuento si oldPrice existe y es mayor que price
   */
  hasDiscount = computed(() => {
    const prod = this.product();
    return prod.oldPrice !== undefined &&
           prod.oldPrice !== null &&
           prod.oldPrice > prod.price;
  });

  /**
   * Computed signal para obtener el precio anterior formateado
   */
  formattedOldPrice = computed(() => {
    const oldPrice = this.product().oldPrice;
    return oldPrice ? oldPrice.toFixed(2) : '0.00';
  });

  constructor(private cartService: CartService) {}

  /**
   * Agrega el producto al carrito
   * Mapea los campos del backend a lo que espera el CartService
   */
  onAddToCart() {
    const productData = this.product();

    this.cartService.addItem({
      id: productData.id, // UUID del backend
      name: productData.name, // Nombre descriptivo
      price: productData.price, // Precio actual
      image: productData.imageUrl, // URL de la imagen
      unit: productData.unit // Unidad de medida
    });
  }
}
