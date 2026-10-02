import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MarketCatalogService } from '../../../../core/services/market/market-catalog.service';
import { CustomerService } from '../../../../core/services/customer/customer.service';
import {
  MarketSectionCustomerDto,
  MarketStoreSummaryDto
} from '../../../../core/models/market.model';
import { ProximityConflictModalComponent } from '../../components/proximity-conflict-modal/proximity-conflict-modal.component';

@Component({
  selector: 'app-market-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, ProximityConflictModalComponent],
  templateUrl: './market-catalog.component.html',
  styleUrl: './market-catalog.component.scss'
})
export class MarketCatalogComponent implements OnInit {
  private router = inject(Router);
  private catalogService = inject(MarketCatalogService);
  private customerService = inject(CustomerService);

  // State signals
  sections = signal<MarketSectionCustomerDto[]>([]);
  stores = signal<MarketStoreSummaryDto[]>([]);
  selectedSectionId = signal<string | null>(null);
  selectedStoreIndex = signal<number>(0);
  searchQuery = signal<string>('');
  isLoading = signal<boolean>(true);

  // Address
  activeAddress = computed(() => this.customerService.getActiveAddress());
  zoneId = computed(() => this.activeAddress()?.zoneId);
  districtName = computed(() => this.activeAddress()?.city || 'Huancayo');

  // Active store in center of roulette
  currentStore = computed(() => {
    const list = this.stores();
    if (list.length === 0) return null;
    const index = Math.min(Math.max(0, this.selectedStoreIndex()), list.length - 1);
    return list[index];
  });

  // Top store in roulette (index - 1)
  prevStore = computed(() => {
    const list = this.stores();
    if (list.length < 2) return null;
    const prevIdx = this.selectedStoreIndex() - 1;
    return prevIdx >= 0 ? list[prevIdx] : list[list.length - 1];
  });

  // Bottom store in roulette (index + 1)
  nextStore = computed(() => {
    const list = this.stores();
    if (list.length < 2) return null;
    const nextIdx = this.selectedStoreIndex() + 1;
    return nextIdx < list.length ? list[nextIdx] : list[0];
  });

  // Selected section object
  selectedSection = computed(() => {
    const id = this.selectedSectionId();
    if (!id) return null;
    return this.sections().find(s => s.id === id) || null;
  });

  // Info banner text
  infoBannerText = computed(() => {
    const sec = this.selectedSection();
    const store = this.currentStore();
    if (sec && store) {
      return `Comercios con ${sec.name} en ${store.name}`;
    }
    if (sec) {
      return `Comercios con ${sec.name} disponibles en ${this.districtName()}`;
    }
    if (store) {
      return `Descubre productos frescos en ${store.name}`;
    }
    return `Explora puestos y bodegas afiliadas en ${this.districtName()}`;
  });

  ngOnInit() {
    this.loadSections();
    this.loadStores();
  }

  loadSections() {
    const zones = this.zoneId() ? [this.zoneId()!] : undefined;
    const lat = this.activeAddress()?.latitude;
    const lng = this.activeAddress()?.longitude;

    this.catalogService.listActiveSections(zones, lat, lng).subscribe({
      next: (secs) => {
        this.sections.set(secs);
      },
      error: (err) => console.error('Error cargando secciones:', err)
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
      next: (stores) => {
        this.stores.set(stores);
        this.selectedStoreIndex.set(0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando tiendas:', err);
        this.isLoading.set(false);
      }
    });
  }

  // Section filter toggle
  onSelectSection(sec: MarketSectionCustomerDto) {
    if (this.selectedSectionId() === sec.id) {
      // Toggle off
      this.selectedSectionId.set(null);
    } else {
      this.selectedSectionId.set(sec.id);
    }
    this.loadStores();
  }

  onSearchChange() {
    this.loadStores();
  }

  // Roulette navigation
  nextStoreSlide() {
    const list = this.stores();
    if (list.length <= 1) return;
    this.selectedStoreIndex.update(idx => (idx + 1) % list.length);
  }

  prevStoreSlide() {
    const list = this.stores();
    if (list.length <= 1) return;
    this.selectedStoreIndex.update(idx => (idx - 1 + list.length) % list.length);
  }

  goToStoreSlide(targetStore: MarketStoreSummaryDto) {
    const list = this.stores();
    const idx = list.findIndex(s => s.id === targetStore.id);
    if (idx !== -1) {
      this.selectedStoreIndex.set(idx);
    }
  }

  // Navigate to Pantalla 2 (Store Detail)
  viewStore(store: MarketStoreSummaryDto) {
    if (!store?.id) return;
    this.router.navigate(['/market/store', store.id], {
      queryParams: this.selectedSectionId() ? { sectionId: this.selectedSectionId() } : undefined
    });
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  // Mouse wheel scroll on the roulette area
  private wheelDebounce = false;
  onWheel(event: WheelEvent) {
    event.preventDefault();
    if (this.wheelDebounce) return;
    this.wheelDebounce = true;
    setTimeout(() => (this.wheelDebounce = false), 250);

    if (event.deltaY > 0) {
      this.nextStoreSlide();
    } else {
      this.prevStoreSlide();
    }
  }

  // Touch swipe support
  private touchStartY = 0;
  onTouchStart(event: TouchEvent) {
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent) {
    const touchEndY = event.changedTouches[0].clientY;
    const diff = this.touchStartY - touchEndY;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        this.nextStoreSlide();
      } else {
        this.prevStoreSlide();
      }
    }
  }
}
