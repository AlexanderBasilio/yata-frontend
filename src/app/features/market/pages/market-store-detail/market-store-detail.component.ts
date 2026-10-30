import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MarketCatalogService } from '../../../../core/services/market/market-catalog.service';
import { MarketCartService } from '../../../../core/services/market/market-cart.service';
import { CustomerService } from '../../../../core/services/customer/customer.service';
import {
  AddMarketCartItemRequest,
  MarketCategoryCustomerDto,
  MarketSectionCustomerDto,
  MarketStoreProductCustomerDto,
  MarketStoreSummaryDto
} from '../../../../core/models/market.model';
import { ProductConfigModalComponent } from '../../components/product-config-modal/product-config-modal.component';
import { ProximityConflictModalComponent } from '../../components/proximity-conflict-modal/proximity-conflict-modal.component';

export interface StoreCategoryItem {
  id: string;
  name: string;
  count: number;
}

@Component({
  selector: 'app-market-store-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ProductConfigModalComponent,
    ProximityConflictModalComponent
  ],
  templateUrl: './market-store-detail.component.html',
  styleUrl: './market-store-detail.component.scss'
})
export class MarketStoreDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogService = inject(MarketCatalogService);
  public cartService = inject(MarketCartService);
  private customerService = inject(CustomerService);

  // Store ID & Details
  storeId = signal<string>('');
  store = signal<MarketStoreSummaryDto | null>(null);
  sections = signal<MarketSectionCustomerDto[]>([]);
  products = signal<MarketStoreProductCustomerDto[]>([]);

  // Filtering states
  selectedSectionId = signal<string | null>(null);
  selectedCategoryId = signal<string | null>(null);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(true);

  // Modal & Toast states
  showCategoriesModal = signal<boolean>(false);
  showConfigModal = signal<boolean>(false);
  productToConfigure = signal<MarketStoreProductCustomerDto | null>(null);
  toastMessage = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  // Dirección formateada
  fullAddress = computed(() => {
    const s = this.store();
    if (!s) return 'Puesto de mercado';
    const parts = [s.address, s.district, s.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Ubicación local';
  });

  // Categorías calculadas dinámicamente desde los productos
  categories = computed<StoreCategoryItem[]>(() => {
    const prods = this.products();
    const map = new Map<string, StoreCategoryItem>();

    for (const p of prods) {
      // Si hay filtro por sección activo, filtrar productos por sección
      const secId = this.selectedSectionId();
      if (secId && p.sectionId && p.sectionId !== secId) {
        continue;
      }

      const id = p.categoryId || (p.categoryName ? p.categoryName.toLowerCase().replace(/\s+/g, '-') : 'general');
      const name = p.categoryName || 'General';

      if (!map.has(id)) {
        map.set(id, { id, name, count: 1 });
      } else {
        map.get(id)!.count++;
      }
    }

    return Array.from(map.values());
  });

  // Categorías visibles según filtros activos y búsqueda
  visibleCategories = computed<StoreCategoryItem[]>(() => {
    const allCats = this.categories();
    const selectedCat = this.selectedCategoryId();

    return allCats.filter(cat => {
      if (selectedCat && cat.id !== selectedCat) {
        return false;
      }
      const items = this.getProductsForCategory(cat.id);
      return items.length > 0;
    });
  });

  // Totales de carrito
  cartItemCount = computed(() => this.cartService.totalItems());
  cartTotal = computed(() => {
    const c = this.cartService.cart();
    return c?.productsSubtotal ?? c?.estimatedTotal ?? 0;
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('storeId') || params.get('id');
      if (id && id !== this.storeId()) {
        this.storeId.set(id);
        this.loadStoreData(id);
      }
    });

    // Cargar carrito activo
    this.cartService.getCart().subscribe();
  }

  loadStoreData(id: string) {
    this.isLoading.set(true);

    const activeAddr = this.customerService.getActiveAddress();
    const lat = activeAddr?.latitude;
    const lng = activeAddr?.longitude;

    // 1. Cargar detalle de la tienda
    this.catalogService.getStoreDetail(id, lat, lng).subscribe({
      next: (storeDetail) => {
        this.store.set(storeDetail);
      },
      error: (err) => console.warn('⚠️ Error al cargar detalle del puesto:', err)
    });

    // 2. Cargar secciones del comercio
    this.catalogService.listStoreSections(id).subscribe({
      next: (secs) => {
        this.sections.set(secs || []);
      },
      error: (err) => console.warn('⚠️ Error al cargar secciones del comercio:', err)
    });

    // 3. Cargar todos los productos del puesto
    this.catalogService.listProductsByStore(id).subscribe({
      next: (prods) => {
        this.products.set(prods || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error al cargar productos del puesto:', err);
        this.products.set([]);
        this.isLoading.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/market/catalog']);
  }

  goToCart() {
    this.router.navigate(['/market/cart']);
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
  }

  // Filtrado por categoría
  filterByCategory(catId: string | null) {
    if (this.selectedCategoryId() === catId) {
      this.selectedCategoryId.set(null);
    } else {
      this.selectedCategoryId.set(catId);
      if (catId) {
        setTimeout(() => {
          const el = document.getElementById(`category-${catId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    }
  }

  // Filtrado por sección
  filterBySection(sectionId: string | null) {
    const nextSec = this.selectedSectionId() === sectionId ? null : sectionId;
    this.selectedSectionId.set(nextSec);
    this.selectedCategoryId.set(null);
  }

  // Modal de categorías
  openCategoriesModal() {
    this.showCategoriesModal.set(true);
  }

  closeCategoriesModal() {
    this.showCategoriesModal.set(false);
  }

  selectCategoryFromModal(catId: string | null) {
    this.selectedCategoryId.set(catId);
    this.closeCategoriesModal();

    if (catId) {
      setTimeout(() => {
        const el = document.getElementById(`category-${catId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  // Productos de una categoría con filtrado de búsqueda
  getProductsForCategory(catId: string): MarketStoreProductCustomerDto[] {
    const query = this.searchQuery().toLowerCase().trim();
    const secId = this.selectedSectionId();

    return this.products().filter(p => {
      // Filtro por sección
      if (secId && p.sectionId && p.sectionId !== secId) {
        return false;
      }

      // Filtro por categoría
      const matchesCat =
        p.categoryId === catId ||
        (!p.categoryId && catId === 'general') ||
        (p.categoryName && p.categoryName.toLowerCase().replace(/\s+/g, '-') === catId);

      if (!matchesCat) return false;

      // Filtro por búsqueda
      if (!query) return true;

      return (
        p.productName.toLowerCase().includes(query) ||
        (p.brandName && p.brandName.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    });
  }

  // Clic en card de producto
  onProductClick(product: MarketStoreProductCustomerDto) {
    this.openConfigModal(product);
  }

  // Botón directo "Agregar" o "Personalizar"
  onQuickAdd(product: MarketStoreProductCustomerDto, event: MouseEvent) {
    event.stopPropagation();

    // Si requiere configuración o tiene variantes, abrir modal
    if (!product.allowsDirectQuickAdd || (product.variants && product.variants.length > 1) || (product.optionGroups && product.optionGroups.length > 0)) {
      this.openConfigModal(product);
      return;
    }

    const saleUnit = (product.primaryPriceUnit as any) || product.measurementType || 'UNIT';
    const quantity = product.unitStep || 1;
    const price = product.primaryPrice || 0;

    const request: AddMarketCartItemRequest = {
      storeId: this.storeId(),
      productId: product.productId,
      variantId: product.variants?.[0]?.id,
      selectedMeasurement: (product.primaryPriceUnit as any) || product.measurementType || 'UNIT',
      quantity: product.unitStep || 1
    };

    this.cartService.addItem(
      request,
      this.store()?.name || 'Comercio de Mercado',
      product.productName,
      price,
      product.primaryImageUrl
    ).subscribe({
      next: () => {
        this.showToast(`¡${product.productName} agregado al carrito!`);
      },
      error: (err) => {
        console.error('Error al agregar producto al carrito:', err);
      }
    });
  }

  openConfigModal(product: MarketStoreProductCustomerDto) {
    this.productToConfigure.set(product);
    this.showConfigModal.set(true);
  }

  closeConfigModal() {
    this.showConfigModal.set(false);
    this.productToConfigure.set(null);
  }

  onConfigModalConfirm(payload: { request: AddMarketCartItemRequest; effectivePrice: number }) {
    const prod = this.productToConfigure();
    this.cartService.addItem(
      payload.request,
      this.store()?.name || 'Comercio de Mercado',
      prod?.productName,
      payload.effectivePrice,
      prod?.primaryImageUrl
    ).subscribe({
      next: () => {
        this.closeConfigModal();
        this.showToast(`¡${prod?.productName || 'Producto'} agregado al carrito!`);
      },
      error: (err) => {
        console.error('Error al agregar producto configurado:', err);
      }
    });
  }

  formatUnit(unit?: string): string {
    if (!unit) return 'unid';
    switch (unit.toUpperCase()) {
      case 'KG':
        return 'kg';
      case 'UNIT':
        return 'unid';
      case 'GRAM':
        return 'g';
      case 'LITER':
        return 'L';
      case 'MILLILITER':
        return 'ml';
      case 'PACKAGE':
        return 'pqte';
      case 'BUNCH':
        return 'atado';
      default:
        return unit.toLowerCase();
    }
  }

  private showToast(msg: string) {
    this.toastMessage.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set(null);
    }, 2800);
  }
}
