import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketCatalogService } from '../../../../core/services/market/market-catalog.service';
import { MarketCartService } from '../../../../core/services/market/market-cart.service';
import { CustomerService } from '../../../../core/services/customer/customer.service';
import {
  AddMarketCartItemRequest,
  MarketCategoryCustomerDto,
  MarketProductVariantDto,
  MarketSectionCustomerDto,
  MarketStoreProductCustomerDto,
  MarketStoreProductPriceOfferDto,
  MarketStoreSummaryDto
} from '../../../../core/models/market.model';
import { ProductConfigModalComponent } from '../../components/product-config-modal/product-config-modal.component';

export interface DialItem<T = any> {
  key: string;
  isFallback: boolean;
  fallbackImage?: string;
  fallbackTitle?: string;
  isEmptyCenter?: boolean;
  data?: T;
}

@Component({
  selector: 'app-market-catalog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductConfigModalComponent
  ],
  templateUrl: './market-catalog.component.html',
  styleUrl: './market-catalog.component.scss'
})
export class MarketCatalogComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogService = inject(MarketCatalogService);
  public cartService = inject(MarketCartService);
  private customerService = inject(CustomerService);

  // Fallback card assets (Spec oficial Cloudinary)
  readonly FALLBACK_STORE_IMG =
    'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1790993541/sinStockComercios_se9rr0.png';
  readonly FALLBACK_PRODUCT_IMG =
    'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1790993532/sinStockProductos_bawofc.png';

  // Navigation states
  viewMode = signal<'stores' | 'products'>('stores'); // Estado 1 (stores) vs Estado 2 (products)
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');

  // Data signals
  stores = signal<MarketStoreSummaryDto[]>([]);
  activeStore = signal<MarketStoreSummaryDto | null>(null);
  sections = signal<MarketSectionCustomerDto[]>([]);
  categories = signal<MarketCategoryCustomerDto[]>([]);
  products = signal<MarketStoreProductCustomerDto[]>([]);

  // Selection states
  selectedSectionId = signal<string | null>(null);
  selectedCategoryId = signal<string | null>(null);

  // Dial roulette indices
  activeStoreIndex = signal<number>(1);
  activeProductIndex = signal<number>(1);
  dragOffsetProgress = signal<number>(0);
  isDragging = signal<boolean>(false);

  // Pointer drag internals
  private pointerStartY = 0;
  private pointerStartTime = 0;
  private wheelDebounceTimer: any = null;

  // Product interaction states
  quickQuantity = signal<number>(1);
  selectedVariantId = signal<string | null>(null);
  favoriteProductIds = signal<Set<string>>(new Set());

  // Modal & Toast states
  showConfigModal = signal<boolean>(false);
  productToConfigure = signal<MarketStoreProductCustomerDto | null>(null);
  toastMessage = signal<string | null>(null);

  // Address
  activeAddress = computed(() => this.customerService.getActiveAddress());
  zoneId = computed(() => this.activeAddress()?.zoneId);
  districtName = computed(() => this.activeAddress()?.city || 'Huancayo');

  // Filtered stores
  filteredStores = computed(() => {
    let list = this.stores();
    const secId = this.selectedSectionId();
    if (secId) {
      list = list.filter(s => s.sections?.some(sec => sec.id === secId));
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.district?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Filtered products
  filteredProducts = computed(() => {
    let list = this.products();
    const catId = this.selectedCategoryId();
    if (catId) {
      list = list.filter(p => p.categoryId === catId);
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        p =>
          p.productName.toLowerCase().includes(q) ||
          p.brandName?.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Dial Items for Stores (Manejo estricto de 3 cards y caso 1 solo elemento)
  dialStoreItems = computed<DialItem<MarketStoreSummaryDto>[]>(() => {
    const list = this.filteredStores();
    if (list.length === 0) {
      return [
        {
          key: 'fb-store-top-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_STORE_IMG,
          fallbackTitle: 'No hay comercios disponibles'
        },
        {
          key: 'fb-store-center-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_STORE_IMG,
          fallbackTitle: 'No hay comercios disponibles',
          isEmptyCenter: true
        },
        {
          key: 'fb-store-bottom-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_STORE_IMG,
          fallbackTitle: 'No hay comercios disponibles'
        }
      ];
    }

    if (list.length === 1) {
      // 🚨 CASO EXCEPCIONAL (1 SOLO COMERCIO):
      // Elemento real al centro (index 1), arriba y abajo tarjeta por defecto pasiva
      return [
        {
          key: 'fb-store-top',
          isFallback: true,
          fallbackImage: this.FALLBACK_STORE_IMG,
          fallbackTitle: 'Sin más comercios'
        },
        {
          key: 'store-' + list[0].id,
          isFallback: false,
          data: list[0]
        },
        {
          key: 'fb-store-bottom',
          isFallback: true,
          fallbackImage: this.FALLBACK_STORE_IMG,
          fallbackTitle: 'Sin más comercios'
        }
      ];
    }

    if (list.length === 2) {
      return [
        { key: 'store-' + list[0].id, isFallback: false, data: list[0] },
        { key: 'store-' + list[1].id, isFallback: false, data: list[1] },
        {
          key: 'fb-store-bottom',
          isFallback: true,
          fallbackImage: this.FALLBACK_STORE_IMG,
          fallbackTitle: 'Sin más comercios'
        }
      ];
    }

    // 3 o más comercios
    return list.map(s => ({
      key: 'store-' + s.id,
      isFallback: false,
      data: s
    }));
  });

  // Dial Items for Products (Manejo estricto de 3 cards y caso 1 solo elemento)
  dialProductItems = computed<DialItem<MarketStoreProductCustomerDto>[]>(() => {
    const list = this.filteredProducts();
    if (list.length === 0) {
      return [
        {
          key: 'fb-prod-top-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_PRODUCT_IMG,
          fallbackTitle: 'No hay productos disponibles'
        },
        {
          key: 'fb-prod-center-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_PRODUCT_IMG,
          fallbackTitle: 'No hay productos disponibles',
          isEmptyCenter: true
        },
        {
          key: 'fb-prod-bottom-empty',
          isFallback: true,
          fallbackImage: this.FALLBACK_PRODUCT_IMG,
          fallbackTitle: 'No hay productos disponibles'
        }
      ];
    }

    if (list.length === 1) {
      // 🚨 CASO EXCEPCIONAL (1 SOLO PRODUCTO):
      // Elemento real al centro (index 1), arriba y abajo tarjeta por defecto pasiva
      return [
        {
          key: 'fb-prod-top',
          isFallback: true,
          fallbackImage: this.FALLBACK_PRODUCT_IMG,
          fallbackTitle: 'Sin más productos'
        },
        {
          key: 'prod-' + list[0].storeProductId,
          isFallback: false,
          data: list[0]
        },
        {
          key: 'fb-prod-bottom',
          isFallback: true,
          fallbackImage: this.FALLBACK_PRODUCT_IMG,
          fallbackTitle: 'Sin más productos'
        }
      ];
    }

    if (list.length === 2) {
      return [
        { key: 'prod-' + list[0].storeProductId, isFallback: false, data: list[0] },
        { key: 'prod-' + list[1].storeProductId, isFallback: false, data: list[1] },
        {
          key: 'fb-prod-bottom',
          isFallback: true,
          fallbackImage: this.FALLBACK_PRODUCT_IMG,
          fallbackTitle: 'Sin más productos'
        }
      ];
    }

    // 3 o más productos
    return list.map(p => ({
      key: 'prod-' + p.storeProductId,
      isFallback: false,
      data: p
    }));
  });

  // Current active dial items and index
  currentDialItems = computed(() => {
    return this.viewMode() === 'stores'
      ? this.dialStoreItems()
      : this.dialProductItems();
  });

  currentActiveIndex = computed(() => {
    return this.viewMode() === 'stores'
      ? this.activeStoreIndex()
      : this.activeProductIndex();
  });

  // Is current dial constrained (single item or empty center)
  isSingleItemConstraint = computed(() => {
    if (this.viewMode() === 'stores') {
      return this.filteredStores().length <= 1;
    }
    return this.filteredProducts().length <= 1;
  });

  // Active items in center
  currentActiveStore = computed<MarketStoreSummaryDto | null>(() => {
    const items = this.dialStoreItems();
    const idx = this.activeStoreIndex();
    const item = items[idx];
    return item && !item.isFallback ? item.data! : null;
  });

  currentActiveProduct = computed<MarketStoreProductCustomerDto | null>(() => {
    const items = this.dialProductItems();
    const idx = this.activeProductIndex();
    const item = items[idx];
    return item && !item.isFallback ? item.data! : null;
  });

  // Selected section object
  selectedSection = computed(() => {
    const id = this.selectedSectionId();
    if (!id) return null;
    return this.sections().find(s => s.id === id) || null;
  });

  // Selected category object
  selectedCategory = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return null;
    return this.categories().find(c => c.id === id) || null;
  });

  // Bottom info banner text
  infoBannerText = computed(() => {
    if (this.viewMode() === 'products') {
      const storeName = this.activeStore()?.name || 'Bodega';
      const cat = this.selectedCategory()?.name;
      const sec = this.selectedSection()?.name || 'Productos';
      return `Productos de ${cat || sec} en ${storeName}`;
    }
    const sec = this.selectedSection();
    const store = this.currentActiveStore();
    if (sec && store) {
      return `Comercios con ${sec.name} en ${store.name}`;
    }
    if (sec) {
      return `Comercios con ${sec.name} en ${this.districtName()}`;
    }
    if (store) {
      return `Descubre puestos y bodegas como ${store.name}`;
    }
    return `Explora puestos y bodegas de mercado en ${this.districtName()}`;
  });

  ngOnInit() {
    this.loadSections();
    this.loadStores();

    // Check if storeId is passed in URL query param or route
    this.route.queryParamMap.subscribe(params => {
      const storeId = params.get('storeId');
      if (storeId) {
        this.selectStoreById(storeId);
      }
    });

    this.route.paramMap.subscribe(params => {
      const storeId = params.get('storeId') || params.get('id');
      if (storeId) {
        this.selectStoreById(storeId);
      }
    });
  }

  // ========================================================
  // DATA LOADING (REAL BACKEND ONLY)
  // ========================================================
  loadSections() {
    const zones = this.zoneId() ? [this.zoneId()!] : undefined;
    const lat = this.activeAddress()?.latitude;
    const lng = this.activeAddress()?.longitude;

    this.catalogService.listActiveSections(zones, lat, lng).subscribe({
      next: secs => {
        this.sections.set(secs);
      },
      error: err => console.error('Error cargando secciones:', err)
    });
  }

  loadStores() {
    this.isLoading.set(true);
    const zones = this.zoneId() ? [this.zoneId()!] : undefined;
    const secId = this.selectedSectionId() || undefined;
    const lat = this.activeAddress()?.latitude;
    const lng = this.activeAddress()?.longitude;
    const search = this.searchQuery().trim() || undefined;

    this.catalogService.listStores(zones, secId, lat, lng, search).subscribe({
      next: stores => {
        this.stores.set(stores);
        // Si hay 1 solo comercio, forzar índice al centro (1); si hay >= 3, al 0
        if (stores.length === 1) {
          this.activeStoreIndex.set(1);
        } else {
          this.activeStoreIndex.set(0);
        }
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error cargando tiendas:', err);
        this.stores.set([]);
        this.activeStoreIndex.set(1);
        this.isLoading.set(false);
      }
    });
  }

  selectStoreById(storeId: string) {
    this.catalogService.getStoreDetail(storeId).subscribe({
      next: st => {
        if (st) {
          this.enterStore(st);
        }
      }
    });
  }

  loadStoreCategoriesAndProducts(storeId: string, sectionId?: string) {
    this.isLoading.set(true);
    const secId = sectionId || this.selectedSectionId();

    if (secId) {
      this.catalogService.listStoreCategories(storeId, secId).subscribe({
        next: cats => {
          this.categories.set(cats);
          if (cats.length > 0 && !this.selectedCategoryId()) {
            this.selectedCategoryId.set(cats[0].id);
          }
          this.loadProductsForStore(storeId, secId, this.selectedCategoryId() || undefined);
        },
        error: () => {
          this.categories.set([]);
          this.loadProductsForStore(storeId, secId, undefined);
        }
      });
    } else {
      this.categories.set([]);
      this.loadProductsForStore(storeId, undefined, undefined);
    }
  }

  loadProductsForStore(storeId: string, sectionId?: string, categoryId?: string) {
    const q = this.searchQuery().trim() || undefined;
    this.catalogService.listProductsByStore(storeId, sectionId, categoryId, q).subscribe({
      next: prods => {
        this.products.set(prods);
        // Si hay 1 solo producto, forzar índice al centro (1); si hay >= 3, al 0
        if (prods.length === 1) {
          this.activeProductIndex.set(1);
        } else {
          this.activeProductIndex.set(0);
        }
        this.quickQuantity.set(1);
        if (prods.length > 0 && prods[0].variants?.length) {
          this.selectedVariantId.set(prods[0].variants[0].id);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.activeProductIndex.set(1);
        this.isLoading.set(false);
      }
    });
  }

  // ========================================================
  // STATE 1 <-> STATE 2 TRANSITIONS
  // ========================================================
  enterStore(store: MarketStoreSummaryDto) {
    this.activeStore.set(store);
    this.viewMode.set('products');
    this.searchQuery.set('');

    // Si la tienda tiene secciones y ninguna está seleccionada, seleccionar la 1ra
    if (store.sections && store.sections.length > 0 && !this.selectedSectionId()) {
      this.selectedSectionId.set(store.sections[0].id);
    }

    this.loadStoreCategoriesAndProducts(store.id, this.selectedSectionId() || undefined);
  }

  returnToStores() {
    this.viewMode.set('stores');
    this.activeStore.set(null);
    this.selectedCategoryId.set(null);
    this.searchQuery.set('');
    this.loadStores();
  }

  // ========================================================
  // LATERAL FILTER SELECTIONS
  // ========================================================
  onSelectSection(sec: MarketSectionCustomerDto) {
    if (this.selectedSectionId() === sec.id) {
      this.selectedSectionId.set(null);
    } else {
      this.selectedSectionId.set(sec.id);
    }

    if (this.viewMode() === 'stores') {
      this.loadStores();
    } else if (this.activeStore()) {
      this.selectedCategoryId.set(null);
      this.loadStoreCategoriesAndProducts(this.activeStore()!.id, this.selectedSectionId() || undefined);
    }
  }

  onSelectCategory(cat: MarketCategoryCustomerDto) {
    if (this.selectedCategoryId() === cat.id) {
      this.selectedCategoryId.set(null);
    } else {
      this.selectedCategoryId.set(cat.id);
    }

    if (this.activeStore()) {
      this.loadProductsForStore(
        this.activeStore()!.id,
        this.selectedSectionId() || undefined,
        this.selectedCategoryId() || undefined
      );
    }
  }

  onSearchChange() {
    if (this.viewMode() === 'stores') {
      this.loadStores();
    } else if (this.activeStore()) {
      this.loadProductsForStore(
        this.activeStore()!.id,
        this.selectedSectionId() || undefined,
        this.selectedCategoryId() || undefined
      );
    }
  }

  // ========================================================
  // GESTURE & POINTER ENGINE (ZERO ARROWS AFFORDANCE)
  // ========================================================
  onPointerDown(event: PointerEvent) {
    // Evitar iniciar arrastre en controles interactivos (botones, selectores, contadores)
    const target = event.target as HTMLElement;
    if (target.closest('button, select, input, a, textarea')) {
      return;
    }

    this.isDragging.set(true);
    this.pointerStartY = event.clientY;
    this.pointerStartTime = performance.now();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.isDragging()) return;

    const deltaY = event.clientY - this.pointerStartY;
    const isSingle = this.isSingleItemConstraint();

    if (isSingle) {
      // Resistencia elástica fuerte (rubber-band) en caso de 1 solo item
      const dampened = deltaY * 0.18;
      this.dragOffsetProgress.set(-dampened / 330);
    } else {
      const items = this.currentDialItems();
      const currentIdx = this.currentActiveIndex();

      // Resistencia elástica en los extremos del dial
      if ((currentIdx === 0 && deltaY > 0) || (currentIdx === items.length - 1 && deltaY < 0)) {
        const dampened = deltaY * 0.25;
        this.dragOffsetProgress.set(-dampened / 330);
      } else {
        this.dragOffsetProgress.set(-deltaY / 330);
      }
    }
  }

  onPointerUp(event: PointerEvent) {
    if (!this.isDragging()) return;
    this.isDragging.set(false);

    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {}

    const isSingle = this.isSingleItemConstraint();
    if (isSingle) {
      // Rebotar al centro obligatorio (index 1)
      this.dragOffsetProgress.set(0);
      if (this.viewMode() === 'stores') this.activeStoreIndex.set(1);
      else this.activeProductIndex.set(1);
      return;
    }

    const deltaY = event.clientY - this.pointerStartY;
    const elapsed = performance.now() - this.pointerStartTime;
    const velocity = deltaY / Math.max(elapsed, 1);

    // Umbral de distancia o velocidad (flick inercial)
    if (deltaY < -40 || velocity < -0.35) {
      this.stepDial(1);
    } else if (deltaY > 40 || velocity > 0.35) {
      this.stepDial(-1);
    }

    this.dragOffsetProgress.set(0);
  }

  onPointerCancel(event: PointerEvent) {
    if (this.isDragging()) {
      this.isDragging.set(false);
      this.dragOffsetProgress.set(0);
    }
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    if (this.isSingleItemConstraint()) return;

    if (this.wheelDebounceTimer) return;
    this.wheelDebounceTimer = setTimeout(() => (this.wheelDebounceTimer = null), 220);

    if (event.deltaY > 20) {
      this.stepDial(1);
    } else if (event.deltaY < -20) {
      this.stepDial(-1);
    }
  }

  // Tap directo en cards adyacentes para centrar
  onCardClick(index: number) {
    const currentIdx = this.currentActiveIndex();
    if (index === currentIdx - 1) {
      this.stepDial(-1);
    } else if (index === currentIdx + 1) {
      this.stepDial(1);
    }
  }

  private stepDial(direction: number) {
    const items = this.currentDialItems();
    if (this.isSingleItemConstraint() || items.length <= 1) return;

    if (this.viewMode() === 'stores') {
      const nextIdx = Math.max(0, Math.min(items.length - 1, this.activeStoreIndex() + direction));
      this.activeStoreIndex.set(nextIdx);
    } else {
      const nextIdx = Math.max(0, Math.min(items.length - 1, this.activeProductIndex() + direction));
      this.activeProductIndex.set(nextIdx);
      this.quickQuantity.set(1);
    }
  }

  // ========================================================
  // PRODUCT PURCHASE ACTIONS
  // ========================================================
  incrementQuantity() {
    this.quickQuantity.update(q => q + 1);
  }

  decrementQuantity() {
    this.quickQuantity.update(q => (q > 1 ? q - 1 : 1));
  }

  toggleFavorite(productId: string) {
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

  onAddProduct(product: MarketStoreProductCustomerDto) {
    if (!product) return;

    if (product.allowsDirectQuickAdd) {
      // Caso 1: Contador rápido directo
      this.executeQuickAdd(product);
    } else {
      // Caso 2: Abre Modal de Configuración (variantes, cortes, peso)
      this.productToConfigure.set(product);
      this.showConfigModal.set(true);
    }
  }

  private executeQuickAdd(product: MarketStoreProductCustomerDto) {
    const store = this.activeStore();
    const req: AddMarketCartItemRequest = {
      storeId: store?.id || product.storeId,
      productId: product.productId,
      variantId: this.selectedVariantId() || undefined,
      selectedMeasurement: product.primaryPriceUnit || 'UNIT',
      quantity: this.quickQuantity()
    };

    this.cartService
      .addItem(
        req,
        store?.name || product.storeName,
        product.productName,
        product.primaryPrice || product.price,
        product.primaryImageUrl
      )
      .subscribe({
        next: () => {
          this.showToast(`¡${product.productName} agregado al carrito!`);
          this.quickQuantity.set(1);
        },
        error: err => console.warn('Error en quick add:', err)
      });
  }

  onConfigModalConfirm(data: { request: AddMarketCartItemRequest; effectivePrice: number }) {
    const store = this.activeStore();
    const prod = this.productToConfigure();

    this.cartService
      .addItem(
        data.request,
        store?.name || prod?.storeName,
        prod?.productName,
        data.effectivePrice,
        prod?.primaryImageUrl
      )
      .subscribe({
        next: () => {
          this.showConfigModal.set(false);
          this.productToConfigure.set(null);
          this.showToast(`¡${prod?.productName || 'Producto'} agregado al carrito!`);
        },
        error: err => console.warn('Error en modal add:', err)
      });
  }

  onCloseConfigModal() {
    this.showConfigModal.set(false);
    this.productToConfigure.set(null);
  }

  private showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  goBack() {
    if (this.viewMode() === 'products') {
      this.returnToStores();
    } else {
      this.router.navigate(['/home']);
    }
  }

  getSectionEmoji(name?: string): string {
    if (!name) return '🏪';
    const lower = name.toLowerCase();
    if (lower.includes('verdura')) return '🥬';
    if (lower.includes('fruta')) return '🍎';
    if (lower.includes('carne')) return '🥩';
    if (lower.includes('pollo') || lower.includes('ave')) return '🍗';
    if (lower.includes('lácteo') || lower.includes('lacteo') || lower.includes('leche')) return '🥛';
    if (lower.includes('abarrote')) return '🥫';
    if (lower.includes('pesca') || lower.includes('marisco')) return '🐟';
    if (lower.includes('pan') || lower.includes('panader')) return '🥖';
    if (lower.includes('limpieza') || lower.includes('aseo')) return '🧼';
    if (lower.includes('bebida') || lower.includes('licor')) return '🧃';
    return '🧺';
  }

  formatPrice(price?: number): string {
    if (price === undefined || price === null) return 'S/ 0.00';
    return `S/ ${price.toFixed(2)}`;
  }

  asStore(data: any): MarketStoreSummaryDto {
    return data as MarketStoreSummaryDto;
  }

  asProduct(data: any): MarketStoreProductCustomerDto {
    return data as MarketStoreProductCustomerDto;
  }

  onVariantDropdownChange(variantId: string, product: MarketStoreProductCustomerDto) {
    this.selectedVariantId.set(variantId);
    this.productToConfigure.set(product);
    this.showConfigModal.set(true);
  }

  getActiveVariants(product: MarketStoreProductCustomerDto): MarketProductVariantDto[] {
    return (product.variants || []).filter(v => v.isActive !== false && v.isAvailable !== false);
  }

  getVariantDisplay(variant: MarketProductVariantDto, product: MarketStoreProductCustomerDto): string {
    if (variant.priceDisplaySummary) {
      return `${variant.name} — ${variant.priceDisplaySummary}`;
    }

    if (variant.prices && variant.prices.length > 0) {
      const parts = variant.prices.map((p: MarketStoreProductPriceOfferDto) => {
        const u = (p.saleUnit || p.measurementType) === 'KG' ? '/ kg' : '/ unid';
        const priceVal = p.zisifyPrice ?? p.price ?? 0;
        return `S/ ${priceVal.toFixed(2)} ${u}`;
      });
      return `${variant.name} — ${parts.join(' · ')}`;
    }

    const price = variant.price || product.primaryPrice || product.price || 0;
    const unit = product.primaryPriceUnit === 'KG' ? '/ kg' : '/ unid';
    return `${variant.name} — S/ ${price.toFixed(2)} ${unit}`;
  }
}
