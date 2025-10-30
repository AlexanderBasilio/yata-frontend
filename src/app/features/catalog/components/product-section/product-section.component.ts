import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../product-card/product-card.component';

interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  discount?: string;
  image: string;
  unit: string;
  description: string;
  pack: string;
}

@Component({
  selector: 'app-product-section',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  template: `
    <section class="product-section py-4">
      <div class="section-header flex justify-between items-center px-3 mb-3">
        <h2 class="text-xl font-bold text-gray-800">{{ title() }}</h2>
        <button class="text-sm text-[#0F456E] font-semibold px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
          Ver más
        </button>
      </div>

      <div class="products-list flex gap-3 overflow-x-auto px-3 scroll-smooth">
        @for (product of products(); track product.id) {
          <app-product-card [product]="product" />
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
  title = input.required<string>();
  products = input<Product[]>([]);
}
