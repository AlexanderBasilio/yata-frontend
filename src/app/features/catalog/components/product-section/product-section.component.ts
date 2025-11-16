import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../product-card/product-card.component';
import { Product } from '../../../../core/services/product/product.service';

@Component({
  selector: 'app-product-section',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  template: `
    <section class="product-section py-4">
      <!-- Header de la sección -->
      <div class="section-header flex justify-between items-center px-3 mb-3">
        <h2 class="text-xl font-bold text-gray-800">{{ title() }}</h2>
        <button class="text-sm text-[#0F456E] font-semibold px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
          Ver más
        </button>
      </div>

      <!-- Lista de productos con scroll horizontal -->
      <div class="products-list flex gap-3 overflow-x-auto px-3 scroll-smooth">
        @for (product of products(); track product.id) {
          <app-product-card [product]="product" />
        }

        <!-- Mensaje si no hay productos en esta categoría -->
        @if (products().length === 0) {
          <div class="w-full text-center py-8 text-gray-500">
            <p>No hay productos disponibles en esta categoría</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .products-list::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class ProductSectionComponent {
  // Usar la interfaz Product del servicio
  title = input.required<string>();
  products = input<Product[]>([]);
}
