import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerComponent } from '../../components/banner/banner.component';
import { InfoTableComponent } from '../../components/info-table/info-table.component';
import { CategoryListComponent } from '../../components/category-list/category-list.component';
import { ProductSectionComponent } from '../../components/product-section/product-section.component';
import { FloatingCartButtonComponent } from '../../../../shared/components/floating-cart-button/floating-cart-button.component';
import { ProductService, Product } from '../../../../core/services/product/product.service';

@Component({
  selector: 'app-catalog-home',
  standalone: true,
  imports: [
    CommonModule,
    BannerComponent,
    InfoTableComponent,
    CategoryListComponent,
    ProductSectionComponent,
    FloatingCartButtonComponent,
  ],
  templateUrl: './catalog-home.component.html',
  styleUrl: './catalog-home.component.scss'
})
export class CatalogHomeComponent implements OnInit {
  // Inyección del servicio de productos
  private productService = inject(ProductService);

  // Signals para cada categoría de productos
  ofertasProducts = signal<Product[]>([]);
  cervezasProducts = signal<Product[]>([]);
  listosParaTomarProducts = signal<Product[]>([]);
  whiskyProducts = signal<Product[]>([]);
  bebidasSinAlcoholProducts = signal<Product[]>([]);
  vinosProducts = signal<Product[]>([]);
  cigarrillosVapesProducts = signal<Product[]>([]);
  aperitivosProducts = signal<Product[]>([]);
  otrosLicoresProducts = signal<Product[]>([]);

  // Signal para indicar si está cargando
  isLoading = signal(true);

  // Signal para manejar errores
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAllProducts();
  }

  /**
   * Carga todos los productos del catálogo desde el backend
   * y los organiza por categorías
   */
  private loadAllProducts(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Obtener todos los productos del rubro "Licores"
    this.productService.getProductsByRubro('Licores').subscribe({
      next: (products) => {
        // Organizar productos por categoría
        this.organizeProductsByCategory(products);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.error.set('No se pudieron cargar los productos. Por favor, intenta de nuevo.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Organiza los productos en sus respectivas categorías
   * Filtra productos con descuento para la sección "Ofertas"
   */
  private organizeProductsByCategory(products: Product[]): void {
    // Filtrar solo productos disponibles
    const availableProducts = products.filter(p => p.isAvailable && p.stockQuantity > 0);

    // Ofertas: productos con oldPrice definido (productos en descuento)
    const ofertas = availableProducts
      .filter(p => p.oldPrice && p.oldPrice > p.price)
      .slice(0, 8); // Limitar a 8 productos
    this.ofertasProducts.set(ofertas);

    // Cervezas
    const cervezas = availableProducts.filter(p => p.category === 'Cerveza');
    this.cervezasProducts.set(cervezas);

    // Listos para Tomar (RTD - Ready To Drink)
    const rtd = availableProducts.filter(p => p.category === 'Listo para beber');
    this.listosParaTomarProducts.set(rtd);

    // Whisky
    const whisky = availableProducts.filter(p => p.category === 'Whiskys');
    this.whiskyProducts.set(whisky);

    // Bebidas sin Alcohol
    const bebidasSinAlcohol = availableProducts.filter(p => p.category === 'Bebidas sin alcohol');
    this.bebidasSinAlcoholProducts.set(bebidasSinAlcohol);

    // Vinos
    const vinos = availableProducts.filter(p => p.category === 'Vinos');
    this.vinosProducts.set(vinos);

    // Cigarrillos y Vapes
    const cigarrillosVapes = availableProducts.filter(p => p.category === 'Cigarrillos y Vaporizadores');
    this.cigarrillosVapesProducts.set(cigarrillosVapes);

    // Aperitivos
    const aperitivos = availableProducts.filter(p => p.category === 'Aperitivos');
    this.aperitivosProducts.set(aperitivos);

    // Otros Licores
    const otrosLicores = availableProducts.filter(p => p.category === 'Otros Licores');
    this.otrosLicoresProducts.set(otrosLicores);
  }

  /**
   * Método para recargar los productos (útil para refrescar el catálogo)
   */
  reloadProducts(): void {
    this.loadAllProducts();
  }
}
