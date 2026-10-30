import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService, Product } from '../../../../core/services/product/product.service';
import { CartService } from '../../../../core/services/cart/cart.service';
import { FloatingCartButtonComponent } from '../../../../shared/components/floating-cart-button/floating-cart-button.component';

export interface DialItem<T = any> {
  key: string;
  isFallback: boolean;
  fallbackImage?: string;
  fallbackTitle?: string;
  isEmptyCenter?: boolean;
  data?: T;
}

export interface LiquorCategory {
  id: string;
  name: string;
  icon?: string;
}

@Component({
  selector: 'app-catalog-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FloatingCartButtonComponent
  ],
  templateUrl: './catalog-home.component.html',
  styleUrl: './catalog-home.component.scss'
})
export class CatalogHomeComponent implements OnInit {
  private productService = inject(ProductService);
  public cartService = inject(CartService);
  private router = inject(Router);

  // Fallback card asset
  readonly FALLBACK_LIQUOR_IMG =
    'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1790993532/sinStockProductos_bawofc.png';

  // Loading & Filter states
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  selectedCategory = signal<string | null>(null);

  // Data signals
  products = signal<Product[]>([]);
  // Categorías preparadas para activar endpoint futuro sin romper nada
  customCategories = signal<LiquorCategory[]>([]);

  // Dial roulette indices
  activeProductIndex = signal<number>(1);
  dragOffsetProgress = signal<number>(0);
  isDragging = signal<boolean>(false);

  // Pointer drag internals
  private pointerStartY = 0;
  private pointerStartTime = 0;
  private wheelDebounceTimer: any = null;

  // Product interaction states
  quickQuantity = signal<number>(1);
  favoriteProductIds = signal<Set<string>>(new Set());
  toastMessage = signal<string | null>(null);

  // Categorías de licores:
  // Si en el futuro existe un endpoint dedicado, usa customCategories();
  // de lo contrario, extrae dinámicamente las categorías reales de los productos del rubro Licores.
  categories = computed<string[]>(() => {
    if (this.customCategories().length > 0) {
      return this.customCategories().map(c => c.name);
    }
    const set = new Set<string>();
    this.products().forEach(p => {
      if (p.category && p.category.trim().length > 0) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  });

  // Filtered products by category & search
  filteredProducts = computed(() => {
    let list = this.products();
    const cat = this.selectedCategory();
    if (cat) {
      list = list.filter(p => p.category?.toLowerCase() === cat.toLowerCase());
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Dial Items for Liquor Products (Zero Overlap & 3-card presentation)
  dialProductItems = computed<DialItem<Product>[]>(() => {
    const list = this.filteredProducts();
    if (list.length === 0) {
      return [
        {
          key: 'fb-liq-top-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_LIQUOR_IMG,
          fallbackTitle: 'No hay licores disponibles'
        },
        {
          key: 'fb-liq-center-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_LIQUOR_IMG,
          fallbackTitle: 'No hay licores disponibles',
          isEmptyCenter: true
        },
        {
          key: 'fb-liq-bottom-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_LIQUOR_IMG,
          fallbackTitle: 'No hay licores disponibles'
        }
      ];
    }

    if (list.length === 1) {
      // 1 solo producto: al centro en index 1, adyacentes pasivos
      return [
        {
          key: 'fb-liq-top',
          isFallback: true,
          fallbackImage: this.FALLBACK_LIQUOR_IMG,
          fallbackTitle: 'Sin más licores'
        },
        {
          key: 'liq-' + list[0].id,
          isFallback: false,
          data: list[0]
        },
        {
          key: 'fb-liq-bottom',
          isFallback: true,
          fallbackImage: this.FALLBACK_LIQUOR_IMG,
          fallbackTitle: 'Sin más licores'
        }
      ];
    }

    if (list.length === 2) {
      return [
        { key: 'liq-' + list[0].id, isFallback: false, data: list[0] },
        { key: 'liq-' + list[1].id, isFallback: false, data: list[1] },
        {
          key: 'fb-liq-bottom',
          isFallback: true,
          fallbackImage: this.FALLBACK_LIQUOR_IMG,
          fallbackTitle: 'Sin más licores'
        }
      ];
    }

    return list.map(p => ({
      key: 'liq-' + p.id,
      isFallback: false,
      data: p
    }));
  });

  isSingleItemConstraint = computed(() => {
    return this.filteredProducts().length <= 1;
  });

  currentActiveProduct = computed<Product | null>(() => {
    const items = this.dialProductItems();
    const idx = this.activeProductIndex();
    const item = items[idx];
    return item && !item.isFallback ? item.data! : null;
  });

  infoBannerText = computed(() => {
    const cat = this.selectedCategory();
    const prod = this.currentActiveProduct();
    if (cat && prod) {
      return `${prod.name} en ${cat}`;
    }
    if (cat) {
      return `Licores de ${cat}`;
    }
    if (prod) {
      return `${prod.name} · ${prod.brand || 'Zisify Licores'}`;
    }
    return 'Explora licores exclusivos y bebidas en Zisify';
  });

  ngOnInit(): void {
    this.loadCategoriesEndpoint();
    this.loadLiquorProducts();
  }

  /**
   * 🔮 Endpoint preparado para Categorías de Licores:
   * Cuando el backend disponga del endpoint dedicado para categorías de licores,
   * se conecta directamente aquí. Actualmente utiliza las categorías de los productos.
   */
  loadCategoriesEndpoint(): void {
    // Ejemplo de activación futura:
    // this.productService.getLiquorCategories?.().subscribe({
    //   next: (cats) => this.customCategories.set(cats),
    //   error: () => {}
    // });
  }

  loadLiquorProducts(): void {
    this.isLoading.set(true);
    this.productService.getProductsByRubro('Licores').subscribe({
      next: (products) => {
        const available = products.filter(p => p.isAvailable && p.stockQuantity > 0);
        this.products.set(available);
        if (available.length === 1) {
          this.activeProductIndex.set(1);
        } else {
          this.activeProductIndex.set(0);
        }
        this.quickQuantity.set(1);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando licores:', err);
        this.products.set([]);
        this.activeProductIndex.set(1);
        this.isLoading.set(false);
      }
    });
  }

  onSelectCategory(categoryName: string | null): void {
    if (this.selectedCategory() === categoryName) {
      this.selectedCategory.set(null);
    } else {
      this.selectedCategory.set(categoryName);
    }

    const list = this.filteredProducts();
    if (list.length === 1) {
      this.activeProductIndex.set(1);
    } else {
      this.activeProductIndex.set(0);
    }
    this.quickQuantity.set(1);
  }

  onSearchChange(): void {
    const list = this.filteredProducts();
    if (list.length === 1) {
      this.activeProductIndex.set(1);
    } else {
      this.activeProductIndex.set(0);
    }
    this.quickQuantity.set(1);
  }

  // ========================================================
  // GESTURE & POINTER ENGINE (SILKY SMOOTH ROULETTE)
  // ========================================================
  onPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('button, select, input, a, textarea')) {
      return;
    }

    this.isDragging.set(true);
    this.pointerStartY = event.clientY;
    this.pointerStartTime = performance.now();
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {}
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) return;

    const deltaY = event.clientY - this.pointerStartY;
    const isSingle = this.isSingleItemConstraint();
    const DRAG_FACTOR = 180;

    if (isSingle) {
      const dampened = deltaY * 0.15;
      this.dragOffsetProgress.set(-dampened / DRAG_FACTOR);
    } else {
      const items = this.dialProductItems();
      const currentIdx = this.activeProductIndex();

      if ((currentIdx === 0 && deltaY > 0) || (currentIdx === items.length - 1 && deltaY < 0)) {
        const dampened = deltaY * 0.22;
        this.dragOffsetProgress.set(-dampened / DRAG_FACTOR);
      } else {
        this.dragOffsetProgress.set(-deltaY / DRAG_FACTOR);
      }
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);

    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {}

    const isSingle = this.isSingleItemConstraint();
    if (isSingle) {
      this.dragOffsetProgress.set(0);
      this.activeProductIndex.set(1);
      return;
    }

    const deltaY = event.clientY - this.pointerStartY;
    const elapsed = performance.now() - this.pointerStartTime;
    const velocity = deltaY / Math.max(elapsed, 1);

    if (deltaY < -25 || velocity < -0.18) {
      this.stepDial(1);
    } else if (deltaY > 25 || velocity > 0.18) {
      this.stepDial(-1);
    }

    this.dragOffsetProgress.set(0);
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.isDragging()) {
      this.isDragging.set(false);
      this.dragOffsetProgress.set(0);
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (this.isSingleItemConstraint()) return;

    if (this.wheelDebounceTimer) return;
    this.wheelDebounceTimer = setTimeout(() => (this.wheelDebounceTimer = null), 140);

    if (event.deltaY > 12) {
      this.stepDial(1);
    } else if (event.deltaY < -12) {
      this.stepDial(-1);
    }
  }

  onCardClick(index: number): void {
    const currentIdx = this.activeProductIndex();
    if (index === currentIdx - 1) {
      this.stepDial(-1);
    } else if (index === currentIdx + 1) {
      this.stepDial(1);
    }
  }

  private stepDial(direction: number): void {
    const items = this.dialProductItems();
    if (this.isSingleItemConstraint() || items.length <= 1) return;

    const nextIdx = Math.max(0, Math.min(items.length - 1, this.activeProductIndex() + direction));
    this.activeProductIndex.set(nextIdx);
    this.quickQuantity.set(1);
  }

  // ========================================================
  // PURCHASING & INTERACTIONS
  // ========================================================
  incrementQuantity(): void {
    this.quickQuantity.update(q => q + 1);
  }

  decrementQuantity(): void {
    this.quickQuantity.update(q => (q > 1 ? q - 1 : 1));
  }

  toggleFavorite(productId: string): void {
    this.favoriteProductIds.update(set => {
      const copy = new Set(set);
      if (copy.has(productId)) copy.delete(productId);
      else copy.add(productId);
      return copy;
    });
  }

  isFavorite(productId: string): boolean {
    return this.favoriteProductIds().has(productId);
  }

  onAddProduct(product: Product): void {
    const qty = this.quickQuantity();
    for (let i = 0; i < qty; i++) {
      this.cartService.addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.imageUrl,
        unit: product.unit || 'unid'
      });
    }

    this.showToast(`¡${product.name} agregado al carrito!`);
    this.quickQuantity.set(1);
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  asProduct(data: any): Product {
    return data as Product;
  }
}
