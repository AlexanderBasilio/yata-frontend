import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarketCatalogService } from '../../../../core/services/market/market-catalog.service';
import { MarketCartService } from '../../../../core/services/market/market-cart.service';
import { MarketSectionCustomerDto, MarketStoreSummaryDto } from '../../../../core/models/market.model';
import { CustomerService, Address } from '../../../../core/services/customer/customer.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { MapboxService } from '../../../../core/services/location/mapbox.service';
import { AccountDrawerComponent } from '../../../../shared/components/account-drawer/account-drawer.component';
import mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-market-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AccountDrawerComponent],
  templateUrl: './market-catalog.component.html',
  styleUrl: './market-catalog.component.scss'
})
export class MarketCatalogComponent implements OnInit, OnDestroy {
  private catalogService = inject(MarketCatalogService);
  private cartService = inject(MarketCartService);
  private customerService = inject(CustomerService);
  public authService = inject(AuthService);
  private mapboxService = inject(MapboxService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Menú lateral "Mi cuenta"
  isSidebarOpen = signal(false);

  // Modal de Proximidad (+100m Tienda Ancla)
  showProximityModal = signal(false);
  blockedStoreSelected = signal<MarketStoreSummaryDto | null>(null);
  isClearingCartForStore = signal(false);

  // Clave de control para evitar recargas duplicadas en bucle reactivo
  private lastLoadedKey = '';

  toggleSidebar() {
    this.isSidebarOpen.update(prev => !prev);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  // Detección de Vertical activa (MARKET | LIQUOR | PETS)
  activeVertical = computed(() => this.catalogService.getActiveVertical());

  verticalTitle = computed(() => {
    switch (this.activeVertical()) {
      case 'LIQUOR': return 'Licorería';
      case 'PETS': return 'Mascotas';
      default: return 'Mercado';
    }
  });

  searchPlaceholder = computed(() => {
    switch (this.activeVertical()) {
      case 'LIQUOR': return 'Buscar licorerías, bodegas y bebidas...';
      case 'PETS': return 'Buscar tiendas de mascotas, veterinarias y alimentos...';
      default: return 'Buscar puestos, bodegas y tiendas de mercado...';
    }
  });

  verticalIcon = computed(() => {
    switch (this.activeVertical()) {
      case 'LIQUOR': return '🍾';
      case 'PETS': return '🐾';
      default: return '🧺';
    }
  });

  emptyLocationMessage = computed(() => {
    switch (this.activeVertical()) {
      case 'LIQUOR': return 'Para ver licorerías en tu zona primero selecciona tu ubicación.';
      case 'PETS': return 'Para ver tiendas de mascotas en tu zona primero selecciona tu ubicación.';
      default: return 'Para ver puestos y bodegas de mercado en tu zona primero selecciona tu ubicación.';
    }
  });

  emptyStoresMessage = computed(() => {
    switch (this.activeVertical()) {
      case 'LIQUOR': return 'Por ahora no tenemos licorerías disponibles para entrega en esta ubicación. Prueba seleccionando o agregando otra dirección.';
      case 'PETS': return 'Por ahora no tenemos tiendas de mascotas disponibles para entrega en esta ubicación. Prueba seleccionando o agregando otra dirección.';
      default: return 'Por ahora no tenemos puestos de mercado disponibles para entrega en esta ubicación. Prueba seleccionando o agregando otra dirección.';
    }
  });

  stores = signal<MarketStoreSummaryDto[]>([]);
  filteredStores = signal<MarketStoreSummaryDto[]>([]);
  sections = signal<MarketSectionCustomerDto[]>([]);
  selectedSectionId = signal<string | null>(null);
  isLoading = signal(true);
  searchQuery = signal('');

  // Address and Zone State
  currentAddress = signal<Address | null>(null);
  customerAddresses = signal<Address[]>([]);
  customerZoneId = signal<string>('HYO_GRID_120_84'); // Default fallback
  showAddressModal = signal(false);
  showAddAddressModal = signal(false);
  editingAddressId = signal<number | null>(null);

  // New Address Form signals
  newLabel = signal('Casa');
  newStreetAddress = signal('');
  newReference = signal('');
  newCity = signal('LIMA');
  newLatitude = signal(-12.003528);
  newLongitude = signal(-76.876778);
  isSavingAddress = signal(false);

  // Mapbox GL instance variables
  private map?: mapboxgl.Map;
  private marker?: mapboxgl.Marker;

  ngOnInit() {
    this.loadCustomerProfileAndAddresses();

    // Escuchar reactivamente cambios en la dirección activa del cliente con takeUntilDestroyed
    this.customerService.activeAddress$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (address) => {
          if (address && address.streetAddress) {
            this.currentAddress.set(address);
            if (address.zoneId) {
              this.customerZoneId.set(address.zoneId);
              this.loadCatalog(address.zoneId, address.latitude, address.longitude);
            } else {
              this.stores.set([]);
              this.filteredStores.set([]);
              this.isLoading.set(false);
            }
          } else {
            this.currentAddress.set(null);
            this.stores.set([]);
            this.filteredStores.set([]);
            this.isLoading.set(false);
          }
        }
      });
  }

  ngOnDestroy() {
    this.cleanupMap();
  }

  loadCustomerProfileAndAddresses(forceNewest: boolean = false) {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.currentAddress.set(null);
      this.customerService.clearActiveAddress();
      this.stores.set([]);
      this.filteredStores.set([]);
      this.isLoading.set(false);
      return;
    }

    this.customerService.getCustomerProfile(userId).subscribe({
      next: (profile) => {
        const addresses = profile.addresses || [];
        this.customerAddresses.set(addresses);

        if (addresses.length === 0) {
          this.currentAddress.set(null);
          this.customerService.clearActiveAddress();
          this.stores.set([]);
          this.filteredStores.set([]);
          this.isLoading.set(false);
          return;
        }

        if (forceNewest) {
          const active = addresses.find(a => a.isDefault) || addresses[addresses.length - 1];
          if (active) {
            this.currentAddress.set(active);
            this.customerService.setActiveAddress(active);
          }
        }
      },
      error: (err) => {
        console.error('❌ Error cargando perfil de cliente en catálogo de mercado:', err);
        this.currentAddress.set(null);
        this.customerService.clearActiveAddress();
        this.stores.set([]);
        this.filteredStores.set([]);
        this.isLoading.set(false);
      }
    });
  }

  loadCatalog(zoneId: string, lat?: number, lng?: number, force: boolean = false) {
    // 🛡️ Detección y bloqueo de bucle reactivo: Si los parámetros no cambiaron, no duplicar llamadas HTTP
    const loadKey = `${zoneId}_${lat || 0}_${lng || 0}_${this.activeVertical()}`;
    if (!force && this.lastLoadedKey === loadKey && this.stores().length > 0) {
      return;
    }
    this.lastLoadedKey = loadKey;

    this.isLoading.set(true);
    const zoneIds = zoneId ? [zoneId] : undefined;

    // 1. Cargar secciones activas de la zona
    this.catalogService.listActiveSections(zoneIds, lat, lng).subscribe({
      next: (sections) => {
        this.sections.set(sections || []);
      },
      error: (err) => {
        console.warn('⚠️ Error al cargar secciones de mercado:', err);
        this.sections.set([]);
      }
    });

    // 2. Cargar comercios de mercado de la zona
    this.loadStores(zoneIds, this.selectedSectionId(), lat, lng, this.searchQuery());
  }

  loadStores(zoneIds?: string[], sectionId?: string | null, lat?: number, lng?: number, search?: string) {
    this.isLoading.set(true);
    this.catalogService.listStores(zoneIds, sectionId || undefined, lat, lng, search).subscribe({
      next: (stores) => {
        const sorted = this.sortStoresByOpenStatus(stores || []);
        this.stores.set(sorted);
        this.filteredStores.set(sorted);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando comercios de mercado:', error);
        this.stores.set([]);
        this.filteredStores.set([]);
        this.isLoading.set(false);
      }
    });
  }

  filterBySection(sectionId: string | null) {
    const nextSectionId = this.selectedSectionId() === sectionId ? null : sectionId;
    this.selectedSectionId.set(nextSectionId);

    const addr = this.currentAddress();
    const zoneIds = addr?.zoneId ? [addr.zoneId] : (this.customerZoneId() ? [this.customerZoneId()] : undefined);
    this.loadStores(zoneIds, nextSectionId, addr?.latitude, addr?.longitude, this.searchQuery());
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.searchQuery.set(query);

    if (!query) {
      this.filteredStores.set(this.stores());
      return;
    }

    const filtered = this.stores().filter(store =>
      store.name.toLowerCase().includes(query) ||
      (store.description && store.description.toLowerCase().includes(query)) ||
      (store.district && store.district.toLowerCase().includes(query)) ||
      (store.sections && store.sections.some(s => s.name.toLowerCase().includes(query)))
    );
    this.filteredStores.set(this.sortStoresByOpenStatus(filtered));
  }

  private sortStoresByOpenStatus(stores: MarketStoreSummaryDto[]): MarketStoreSummaryDto[] {
    if (!stores || !Array.isArray(stores)) return [];
    return [...stores].sort((a, b) => {
      // 1. Proximidad respecto a la tienda ancla del carrito: compatibles primero
      const aCompat = a.canAddToCurrentCart !== false;
      const bCompat = b.canAddToCurrentCart !== false;
      if (aCompat && !bCompat) return -1;
      if (!aCompat && bCompat) return 1;

      // 2. Horario de atención: abiertos primero
      const aOpen = Boolean(a.isOpen && !a.isTemporarilyClosed);
      const bOpen = Boolean(b.isOpen && !b.isTemporarilyClosed);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;

      return 0;
    });
  }

  onStoreClick(store: MarketStoreSummaryDto) {
    // 🔒 1. Si la tienda está a más de 100m de la tienda ancla del carrito: abrir modal de proximidad
    if (store.canAddToCurrentCart === false) {
      this.blockedStoreSelected.set(store);
      this.showProximityModal.set(true);
      return;
    }

    // 2. Si la tienda está cerrada: no ingresar
    if (!store.isOpen || store.isTemporarilyClosed) {
      return;
    }

    // 3. Navegación directa al detalle según la vertical activa
    const prefix = this.activeVertical() === 'LIQUOR' ? '/liquor/store' : (this.activeVertical() === 'PETS' ? '/pets/store' : '/market/store');
    this.router.navigate([prefix, store.id]);
  }

  closeProximityModal() {
    this.showProximityModal.set(false);
    this.blockedStoreSelected.set(null);
  }

  confirmClearCartAndNavigate() {
    const targetStore = this.blockedStoreSelected();
    if (!targetStore || this.isClearingCartForStore()) return;

    this.isClearingCartForStore.set(true);
    this.cartService.clearCart().subscribe({
      next: () => {
        this.isClearingCartForStore.set(false);
        this.showProximityModal.set(false);
        this.blockedStoreSelected.set(null);

        // Forzar recarga de catálogo para que todas las tiendas vuelvan a estar habilitadas
        this.lastLoadedKey = '';
        const addr = this.currentAddress();
        const zoneId = addr?.zoneId || this.customerZoneId();
        if (zoneId) {
          this.loadCatalog(zoneId, addr?.latitude, addr?.longitude, true);
        }

        const prefix = this.activeVertical() === 'LIQUOR' ? '/liquor/store' : (this.activeVertical() === 'PETS' ? '/pets/store' : '/market/store');
        this.router.navigate([prefix, targetStore.id]);
      },
      error: (err) => {
        console.error('❌ Error al vaciar carrito para comercio lejano:', err);
        this.isClearingCartForStore.set(false);
        alert('Hubo un error al vaciar el carrito en el servidor. Por favor inténtalo nuevamente.');
      }
    });
  }

  getStoreSectionsDisplay(store: MarketStoreSummaryDto): string {
    if (store.sections && store.sections.length > 0) {
      return store.sections.map(s => s.name).join(' • ');
    }
    return store.description || 'Puesto de mercado y productos frescos';
  }

  // Address Modals Logic
  selectAddress(address: Address) {
    this.currentAddress.set(address);
    this.customerService.setActiveAddress(address);
    this.showAddressModal.set(false);
  }

  openAddressModal() {
    this.showAddressModal.set(true);
  }

  closeAddressModal() {
    this.showAddressModal.set(false);
  }

  openAddAddressModal() {
    this.editingAddressId.set(null);
    this.newLabel.set('Casa');
    this.newStreetAddress.set('');
    this.newReference.set('');
    this.newCity.set('LIMA');
    this.newLatitude.set(-12.003528);
    this.newLongitude.set(-76.876778);
    this.showAddAddressModal.set(true);
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  openEditAddressModal(address: Address, event?: MouseEvent) {
    event?.stopPropagation();
    if (!address.id) return;

    this.editingAddressId.set(address.id);
    this.newLabel.set(address.label || 'Casa');
    this.newStreetAddress.set(address.streetAddress || '');
    this.newReference.set(address.reference || '');
    this.newCity.set(address.city || 'LIMA');
    this.newLatitude.set(address.latitude || -12.003528);
    this.newLongitude.set(address.longitude || -76.876778);
    this.showAddAddressModal.set(true);
    setTimeout(() => {
      this.initMap(address.latitude, address.longitude);
    }, 100);
  }

  closeAddAddressModal() {
    this.showAddAddressModal.set(false);
    this.editingAddressId.set(null);
    this.cleanupMap();
  }

  deleteAddress(address: Address, event?: MouseEvent) {
    event?.stopPropagation();
    const userId = this.authService.getUserId();
    if (!userId || !address.id) return;

    const confirmDelete = confirm(`¿Estás seguro de eliminar la dirección "${address.label}" (${address.streetAddress})?`);
    if (!confirmDelete) return;

    this.customerService.deleteAddress(userId, address.id).subscribe({
      next: () => {
        if (this.currentAddress()?.id === address.id) {
          localStorage.removeItem('zisify_active_address');
        }
        this.loadCustomerProfileAndAddresses(true);
      },
      error: (err) => {
        console.error('❌ Error eliminando dirección en catálogo de mercado:', err);
        alert('Hubo un error al eliminar la dirección.');
      }
    });
  }

  private cleanupMap() {
    if (this.marker) {
      this.marker.remove();
      this.marker = undefined;
    }
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private initMap(initialLat?: number, initialLng?: number) {
    this.cleanupMap();

    const lat = initialLat || -12.003528;
    const lng = initialLng || -76.876778;
    const defaultCenter: [number, number] = [lng, lat];

    try {
      this.map = this.mapboxService.createMap('addressCatalogMap', defaultCenter, 15);

      this.map.on('load', () => {
        this.marker = new mapboxgl.Marker({
          draggable: true,
          color: '#C30364'
        })
          .setLngLat(defaultCenter)
          .addTo(this.map!);

        this.newLatitude.set(lat);
        this.newLongitude.set(lng);

        this.marker.on('dragend', () => {
          const lngLat = this.marker!.getLngLat();
          this.updateCoords(lngLat.lat, lngLat.lng);
        });

        this.map!.on('click', (e) => {
          this.marker!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          this.updateCoords(e.lngLat.lat, e.lngLat.lng);
        });
      });
    } catch (e) {
      console.error('Error initializing map in market catalog:', e);
    }
  }

  async updateCoords(lat: number, lng: number) {
    this.newLatitude.set(lat);
    this.newLongitude.set(lng);

    const location = await this.mapboxService.reverseGeocode(lng, lat);
    if (location) {
      this.newStreetAddress.set(location.address);
      if (location.city) {
        this.newCity.set(location.city.toUpperCase());
      }
    }
  }

  useCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.updateCoords(lat, lng);

          if (this.map && this.marker) {
            this.map.flyTo({ center: [lng, lat], zoom: 16 });
            this.marker.setLngLat([lng, lat]);
          }
        },
        (error) => {
          console.error('Error fetching current location in market catalog:', error);
          alert('No se pudo acceder a tu ubicación actual. Selecciona la ubicación en el mapa.');
        }
      );
    } else {
      alert('Tu navegador no soporta geolocalización.');
    }
  }

  saveNewAddress() {
    const userId = this.authService.getUserId();
    if (!userId) {
      alert('Debes iniciar sesión para guardar direcciones.');
      return;
    }

    if (!this.newStreetAddress().trim()) {
      alert('Por favor ingresa la dirección.');
      return;
    }

    this.isSavingAddress.set(true);

    const addressData: Address = {
      label: this.newLabel(),
      streetAddress: this.newStreetAddress().trim(),
      reference: this.newReference().trim() || undefined,
      city: this.newCity().toUpperCase(),
      latitude: this.newLatitude(),
      longitude: this.newLongitude(),
      isDefault: true
    };

    const addressId = this.editingAddressId();

    if (addressId) {
      this.customerService.updateAddress(userId, addressId, addressData).subscribe({
        next: (response) => {
          const savedAddrWithZone = response && response.zoneId ? response : null;
          if (savedAddrWithZone) {
            this.currentAddress.set(savedAddrWithZone);
            this.customerService.setActiveAddress(savedAddrWithZone);
          }

          this.newStreetAddress.set('');
          this.newReference.set('');
          this.editingAddressId.set(null);
          this.showAddAddressModal.set(false);
          this.showAddressModal.set(false);
          this.isSavingAddress.set(false);

          this.loadCustomerProfileAndAddresses(true);
        },
        error: (err) => {
          console.error('❌ Error editando dirección en catálogo de mercado:', err);
          alert('Hubo un error al actualizar la dirección.');
          this.isSavingAddress.set(false);
        }
      });
    } else {
      this.customerService.addAddress(userId, addressData).subscribe({
        next: (response) => {
          const savedAddrWithZone = response && response.zoneId ? response : null;
          if (savedAddrWithZone) {
            this.currentAddress.set(savedAddrWithZone);
            this.customerService.setActiveAddress(savedAddrWithZone);
          }

          this.newStreetAddress.set('');
          this.newReference.set('');
          this.showAddAddressModal.set(false);
          this.showAddressModal.set(false);
          this.isSavingAddress.set(false);

          this.loadCustomerProfileAndAddresses(true);
        },
        error: (err) => {
          console.error('❌ Error guardando dirección en catálogo de mercado:', err);
          alert('Hubo un error al registrar la dirección.');
          this.isSavingAddress.set(false);
        }
      });
    }
  }
}
