import { Component, input, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../product-card/product-card.component';
import { Product } from '../../../../core/services/product/product.service';

@Component({
  selector: 'app-product-section',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './product-section.component.html',
  styleUrl: './product-section.component.scss'
})
export class ProductSectionComponent implements AfterViewInit {
  // Inputs
  title = input.required<string>();
  products = input<Product[]>([]);

  // ViewChild para acceder al contenedor de scroll
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  // Signals para controlar las flechas
  canScrollLeft = signal(false);
  canScrollRight = signal(true);

  ngAfterViewInit() {
    // Verificar scroll inicial después de que se rendericen las cards
    setTimeout(() => this.updateScrollIndicators(), 150);
  }

  onScroll() {
    this.updateScrollIndicators();
  }

  /**
   * Desplazar hacia la izquierda
   */
  scrollLeft() {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    const scrollAmount = container.clientWidth * 0.8; // Desplazar 80% del ancho visible
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  }

  /**
   * Desplazar hacia la derecha
   */
  scrollRight() {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    const scrollAmount = container.clientWidth * 0.8; // Desplazar 80% del ancho visible
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  private updateScrollIndicators() {
    if (!this.scrollContainer) return;

    const container = this.scrollContainer.nativeElement;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;

    // Actualizar señales con margen de tolerancia de 10px
    this.canScrollLeft.set(scrollLeft > 10);
    this.canScrollRight.set(scrollLeft < scrollWidth - clientWidth - 10);
  }
}
