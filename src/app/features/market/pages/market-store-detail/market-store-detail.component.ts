import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { ProximityConflictModalComponent } from '../../components/proximity-conflict-modal/proximity-conflict-modal.component';

@Component({
  selector: 'app-market-store-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductConfigModalComponent, ProximityConflictModalComponent],
  templateUrl: './market-store-detail.component.html',
  styleUrl: './market-store-detail.component.scss'
})
export class MarketStoreDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogService = inject(MarketCatalogService);
  public cartService = inject(MarketCartService);
  private customerService = inject(CustomerService);

  // Store ID
  storeId = signal<string>('');

  // Store details
  store = signal<MarketStoreSummaryDto | null>(null);
  sections = signal<MarketSectionCustomerDto[]>([]);
  categories = signal<MarketCategoryCustomerDto[]>([]);
  products = signal<MarketStoreProductCustomerDto[]>([]);

  // Selection states
  selectedSectionId = signal<string | null>(null);
  selectedCategoryId = signal<string | null>(null);
  selectedProductIndex = signal<number>(0);
  searchQuery = signal<string>('');
  quickQuantity = signal<number>(1);
  selectedVariantId = signal<string | null>(null);
  favoriteProductIds = signal<Set<string>>(new Set());

  // Modal states
  showConfigModal = signal<boolean>(false);
  productToConfigure = signal<MarketStoreProductCustomerDto | null>(null);
  toastMessage = signal<string | null>(null);
  isLoading = signal<boolean>(true);

  // Active product in center of semicircular carousel
  currentProduct = computed(() => {
    const list = this.products();
    if (list.length === 0) return null;
    const index = Math.min(Math.max(0, this.selectedProductIndex()), list.length - 1);
    return list[index];
  });

  // Previous product (top tilted card)
  prevProduct = computed(() => {
    const list = this.products();
    if (list.length < 2) return null;
    const prevIdx = this.selectedProductIndex() - 1;
    return prevIdx >= 0 ? list[prevIdx] : list[list.length - 1];
  });

  // Next product (bottom tilted card)
  nextProduct = computed(() => {
    const list = this.products();
    if (list.length < 2) return null;
    const nextIdx = this.selectedProductIndex() + 1;
    return nextIdx < list.length ? list[nextIdx] : list[0];
  });

  // Active section
  selectedSection = computed(() => {
    const id = this.selectedSectionId();
    return this.sections().find(s => s.id === id) || this.sections()[0] || null;
  });

  // Active category
  selectedCategory = computed(() => {
    const id = this.selectedCategoryId();
    return this.categories().find(c => c.id === id) || null;
  });

  // Info banner
  infoBannerText = computed(() => {
    const cat = this.selectedCategory()?.name;
    const sec = this.selectedSection()?.name || 'Productos';
    const stName = this.store()?.name || 'la bodega';
    return `Productos de ${cat || sec} en ${stName}`;
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('storeId') || params.get('id');
      if (id) {
        this.storeId.set(id);
        this.loadStoreHeader(id);
        this.loadStoreSections(id);
      }
    });

    // Check optional queryParams (e.g., initial sectionId)
    this.route.queryParamMap.subscribe(qParams => {
      const secId = qParams.get('sectionId');
      if (secId) {
        this.selectedSectionId.set(secId);
      }
    });
  }

  loadStoreHeader(id: string) {
    const addr = this.customerService.getActiveAddress();
    this.catalogService.getStoreDetail(id, addr?.latitude, addr?.longitude).subscribe({
      next: (st) => this.store.set(st),
      error: (err) => console.error('Error cargando cabecera de tienda:', err)
    });
  }

  loadStoreSections(id: string) {
    this.catalogService.listStoreSections(id).subscribe({
      next: (secs) => {
        this.sections.set(secs);
        if (secs.length > 0 && !this.selectedSectionId()) {
          this.selectedSectionId.set(secs[0].id);
        }
        if (this.selectedSectionId()) {
          this.loadCategories(id, this.selectedSectionId()!);
        }
      },
      error: (err) => console.error('Error cargando secciones de la tienda:', err)
    });
  }

  loadCategories(storeId: string, sectionId: string) {
    this.catalogService.listStoreCategories(storeId, sectionId).subscribe({
      next: (cats) => {
        this.categories.set(cats);
        // Default to first category if available
        if (cats.length > 0 && !this.selectedCategoryId()) {
          this.selectedCategoryId.set(cats[0].id);
        }
        this.loadProducts();
      },
      error: (err) => {
        console.error('Error cargando categorías:', err);
        this.loadProducts();
      }
    });
  }

  loadProducts() {
    this.isLoading.set(true);
    const storeId = this.storeId();
    const sectionId = this.selectedSectionId() || undefined;
    const categoryId = this.selectedCategoryId() || undefined;
    const search = this.searchQuery().trim() || undefined;

    this.catalogService.listProductsByStore(storeId, sectionId, categoryId, search).subscribe({
      next: (prods) => {
        this.products.set(prods);
        this.selectedProductIndex.set(0);
        this.quickQuantity.set(1);
        if (prods.length > 0 && prods[0].variants?.length) {
          this.selectedVariantId.set(prods[0].variants[0].id);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.isLoading.set(false);
      }
    });
  }

  // Dual-column navigation actions
  onSelectSection(sec: MarketSectionCustomerDto) {
    this.selectedSectionId.set(sec.id);
    this.selectedCategoryId.set(null);
    this.loadCategories(this.storeId(), sec.id);
  }

  onSelectCategory(cat: MarketCategoryCustomerDto) {
    this.selectedCategoryId.set(cat.id);
    this.loadProducts();
  }

  onSearchChange() {
    this.loadProducts();
  }

  // Product carousel navigation
  nextProductSlide() {
    const list = this.products();
    if (list.length <= 1) return;
    this.selectedProductIndex.update(idx => (idx + 1) % list.length);
    this.quickQuantity.set(1);
  }

  prevProductSlide() {
    const list = this.products();
    if (list.length <= 1) return;
    this.selectedProductIndex.update(idx => (idx - 1 + list.length) % list.length);
    this.quickQuantity.set(1);
  }

  // Stepper on active card
  incrementQuantity() {
    this.quickQuantity.update(q => q + 1);
  }

  decrementQuantity() {
    this.quickQuantity.update(q => (q > 1 ? q - 1 : 1));
  }

  // Toggle favorite
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

  // ========================================================
  // REGLA DE ORO: CONTADOR RÁPIDO VS MODAL DETALLE
  // ========================================================
  onAddProductClick(product: MarketStoreProductCustomerDto) {
    if (!product) return;

    if (product.allowsDirectQuickAdd) {
      // CASO 1: Agregación Rápida Directa
      this.executeQuickAdd(product);
    } else {
      // CASO 2: Abre Modal de Configuración
      this.openProductConfig(product);
    }
  }

  private executeQuickAdd(product: MarketStoreProductCustomerDto) {
    const store = this.store();
    const req: AddMarketCartItemRequest = {
      storeId: this.storeId(),
      productId: product.productId,
      variantId: this.selectedVariantId() || undefined,
      selectedMeasurement: product.primaryPriceUnit || 'UNIT',
      quantity: this.quickQuantity()
    };

    this.cartService
      .addItem(
        req,
        store?.name || 'Bodega Milagros',
        product.productName,
        product.primaryPrice || product.price,
        product.primaryImageUrl
      )
      .subscribe({
        next: () => {
          this.showToast(`¡${product.productName} agregado al carrito!`);
          this.quickQuantity.set(1);
        },
        error: (err) => console.warn('Error en quick add:', err)
      });
  }

  openProductConfig(product: MarketStoreProductCustomerDto) {
    const active = this.getActiveVariants(product);
    if (active.length > 0 && (!this.selectedVariantId() || !active.some(v => v.id === this.selectedVariantId()))) {
      this.selectedVariantId.set(active[0].id);
    }
    this.productToConfigure.set(product);
    this.showConfigModal.set(true);
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

  onConfigModalConfirm(data: { request: AddMarketCartItemRequest; effectivePrice: number }) {
    const store = this.store();
    const prod = this.productToConfigure();

    this.cartService
      .addItem(
        data.request,
        store?.name || 'Bodega Milagros',
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
        error: (err) => console.warn('Error en modal add:', err)
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
    this.router.navigate(['/market']);
  }

  // Wheel and Touch navigation on product roulette
  private wheelDebounce = false;
  onWheel(event: WheelEvent) {
    event.preventDefault();
    if (this.wheelDebounce) return;
    this.wheelDebounce = true;
    setTimeout(() => (this.wheelDebounce = false), 250);

    if (event.deltaY > 0) {
      this.nextProductSlide();
    } else {
      this.prevProductSlide();
    }
  }

  private touchStartY = 0;
  onTouchStart(event: TouchEvent) {
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent) {
    const touchEndY = event.changedTouches[0].clientY;
    const diff = this.touchStartY - touchEndY;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        this.nextProductSlide();
      } else {
        this.prevProductSlide();
      }
    }
  }
}
