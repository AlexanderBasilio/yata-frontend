import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RestaurantService, Specialty } from '../../../../core/services/restaurant/restaurant.service';
import { Restaurant } from '../../../../core/models/restaurant.model';
import { RestaurantCardComponent } from '../restaurant-card/restaurant-card.component';
import { CustomerService, Address } from '../../../../core/services/customer/customer.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { MapboxService } from '../../../../core/services/location/mapbox.service';
import { AccountDrawerComponent } from '../../../../shared/components/account-drawer/account-drawer.component';
import mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-restaurant-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, RestaurantCardComponent, FormsModule, AccountDrawerComponent],
  templateUrl: './restaurant-catalog.component.html',
  styleUrl: './restaurant-catalog.component.scss'
})
export class RestaurantCatalogComponent implements OnInit, OnDestroy {
  private restaurantService = inject(RestaurantService);
  private customerService = inject(CustomerService);
  public authService = inject(AuthService);
  private mapboxService = inject(MapboxService);
  private router = inject(Router);

  // Menú lateral "Mi cuenta"
  isSidebarOpen = signal(false);

  toggleSidebar() {
    this.isSidebarOpen.update(prev => !prev);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  restaurants = signal<Restaurant[]>([]);
  filteredRestaurants = signal<Restaurant[]>([]);
  specialties = signal<Specialty[]>([]);
  selectedSpecialty = signal<string | null>(null);
  showSpecialtiesModal = signal(false);
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
    this.specialties.set(this.restaurantService.getSpecialties());
    this.loadCustomerProfileAndAddresses();
    
    // Reactivamente escuchar cambios en la dirección activa del cliente
    this.customerService.activeAddress$.subscribe({
      next: (address) => {
        console.group('📍 [Catálogo Food] Dirección activa recibida');
        console.log('📦 Objeto dirección activo:', address);
        if (address && address.streetAddress) {
          this.currentAddress.set(address);
          if (address.zoneId) {
            console.log('🌍 ZoneID activo detectado:', address.zoneId);
            this.customerZoneId.set(address.zoneId);
            this.loadRestaurants(address.zoneId);
          } else {
            console.warn('⚠️ La dirección activa NO contiene zoneId.');
            this.restaurants.set([]);
            this.filteredRestaurants.set([]);
            this.isLoading.set(false);
          }
        } else {
          this.currentAddress.set(null);
          this.restaurants.set([]);
          this.filteredRestaurants.set([]);
          this.isLoading.set(false);
        }
        console.groupEnd();
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
      this.restaurants.set([]);
      this.filteredRestaurants.set([]);
      this.isLoading.set(false);
      return;
    }

    this.customerService.getCustomerProfile(userId).subscribe({
      next: (profile) => {
        const addresses = profile.addresses || [];
        this.customerAddresses.set(addresses);
        
        if (addresses.length === 0) {
          console.log('📍 [Sync Backend - Food] No hay direcciones en backend.');
          this.currentAddress.set(null);
          this.customerService.clearActiveAddress();
          this.restaurants.set([]);
          this.filteredRestaurants.set([]);
          this.isLoading.set(false);
          return;
        }

        let active: Address | null = null;
        if (forceNewest) {
          active = addresses.find(a => a.isDefault) || addresses[addresses.length - 1];
        } else {
          const saved = this.customerService.getActiveAddress();
          const stillExists = saved ? addresses.find(a => (saved.id && a.id === saved.id) || (a.streetAddress === saved.streetAddress)) : null;
          active = stillExists || addresses.find(a => a.isDefault) || addresses[0];
        }

        if (active && active.streetAddress) {
          console.log('📍 [Estado Activo - Food] Dirección configurada activa con zoneId:', active.zoneId || 'SIN_ZONE_ID');
          this.currentAddress.set(active);
          this.customerService.setActiveAddress(active);
          if (active.zoneId) {
            this.customerZoneId.set(active.zoneId);
            this.loadRestaurants(active.zoneId);
          } else {
            this.restaurants.set([]);
            this.filteredRestaurants.set([]);
            this.isLoading.set(false);
          }
        } else {
          this.currentAddress.set(null);
          this.customerService.clearActiveAddress();
          this.restaurants.set([]);
          this.filteredRestaurants.set([]);
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('❌ Error cargando perfil de cliente en catálogo:', err);
        this.currentAddress.set(null);
        this.customerService.clearActiveAddress();
        this.restaurants.set([]);
        this.filteredRestaurants.set([]);
        this.isLoading.set(false);
      }
    });
  }

  openSpecialtiesModal() {
    this.showSpecialtiesModal.set(true);
  }

  closeSpecialtiesModal() {
    this.showSpecialtiesModal.set(false);
  }

  loadRestaurants(zoneId: string) {
    this.isLoading.set(true);
    this.restaurantService.getAllRestaurants(zoneId).subscribe({
      next: (restaurants) => {
        console.log('✅ Catálogo recibido para zona ' + zoneId + ':', restaurants);
        this.restaurants.set(restaurants);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando catálogo:', error);
        this.restaurants.set([]);
        this.filteredRestaurants.set([]);
        this.isLoading.set(false);
      }
    });
  }

  filterBySpecialty(specialty: string | null) {
    if (!specialty || this.selectedSpecialty() === specialty) {
      // Deseleccionar y ver todos los restaurantes
      this.selectedSpecialty.set(null);
    } else {
      // Seleccionar especialidad para filtrar
      this.selectedSpecialty.set(specialty);
    }
    this.closeSpecialtiesModal();
    this.applyFilters();
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchQuery.set(query);
    this.applyFilters();
  }

  private normalizeStr(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private compareTerms(a: string, b: string): boolean {
    const normA = this.normalizeStr(a);
    const normB = this.normalizeStr(b);
    if (!normA || !normB) return false;
    if (normA.includes(normB) || normB.includes(normA)) return true;
    // Prefix stem match (e.g. "marisqueria" vs "mariscos" -> "marisc")
    const stemA = normA.length > 5 ? normA.substring(0, 5) : normA;
    const stemB = normB.length > 5 ? normB.substring(0, 5) : normB;
    return stemA === stemB;
  }

  applyFilters() {
    const selected = this.selectedSpecialty();
    const query = this.normalizeStr(this.searchQuery());
    let list = this.restaurants();

    // 1. Filtrar por especialidad activa
    if (selected) {
      list = list.filter(r => this.matchesSpecialty(r, selected));
    }

    // 2. Filtrar por búsqueda de texto
    if (query) {
      list = list.filter(r =>
        this.normalizeStr(r.name).includes(query) ||
        this.normalizeStr(r.slogan || '').includes(query) ||
        this.normalizeStr(r.description || '').includes(query) ||
        (r.specialties && r.specialties.some(s => this.normalizeStr(typeof s === 'string' ? s : s.name).includes(query))) ||
        (r.categories && r.categories.some(c => this.normalizeStr(c).includes(query)))
      );
    }

    this.filteredRestaurants.set(this.sortRestaurantsByOpenStatus(list));
  }

  private matchesSpecialty(r: Restaurant, targetSpecialty: string): boolean {
    if (!targetSpecialty) return true;

    // Comparar con cada especialidad asignada al restaurante
    const inSpecialties = r.specialties && r.specialties.some(s => {
      const name = typeof s === 'string' ? s : s.name || '';
      return this.compareTerms(name, targetSpecialty);
    });
    if (inSpecialties) return true;

    // Comparar con categorías
    const inCategories = r.categories && r.categories.some(c => {
      return this.compareTerms(c, targetSpecialty);
    });
    if (inCategories) return true;

    // Fallback: nombre o slogan o descripción
    if (this.compareTerms(r.name, targetSpecialty) ||
        this.compareTerms(r.slogan || '', targetSpecialty) ||
        this.compareTerms(r.description || '', targetSpecialty)) {
      return true;
    }

    return false;
  }

  private sortRestaurantsByOpenStatus(restaurants: Restaurant[]): Restaurant[] {
    if (!restaurants || !Array.isArray(restaurants)) return [];
    return [...restaurants].sort((a, b) => {
      const aOpen = Boolean(a.isOpen && !a.isTemporarilyClosed);
      const bOpen = Boolean(b.isOpen && !b.isTemporarilyClosed);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      return 0;
    });
  }

  onRestaurantClick(restaurant: Restaurant) {
    if (!restaurant.isOpen || restaurant.isTemporarilyClosed) {
      return;
    }
    this.router.navigate(['/food/restaurant', restaurant.id]);
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
        console.log('✅ [Catalog DELETE HTTP Exitoso] Dirección eliminada');
        
        if (this.currentAddress()?.id === address.id) {
          localStorage.removeItem('zisify_active_address');
        }

        this.loadCustomerProfileAndAddresses(true);
      },
      error: (err) => {
        console.error('❌ Error eliminando dirección en catálogo:', err);
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
          color: '#22C55E'
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
      console.error('Error initializing map in catalog:', e);
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
          console.error('Error fetching current location in catalog:', error);
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
      console.log('📍 [Catalog PUT] Editando dirección ID:', addressId);
      this.customerService.updateAddress(userId, addressId, addressData).subscribe({
        next: (response) => {
          console.log('✅ [Catalog PUT] Exitoso:', response);
          
          let savedAddrWithZone = response && response.zoneId ? response : null;

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
          console.error('❌ Error editando dirección en catálogo:', err);
          alert('Hubo un error al actualizar la dirección.');
          this.isSavingAddress.set(false);
        }
      });
    } else {
      console.log('📍 [Catalog POST] Creando nueva dirección');
      this.customerService.addAddress(userId, addressData).subscribe({
        next: (response) => {
          console.log('✅ [Catalog POST] Exitoso:', response);
          
          let savedAddrWithZone = response && response.zoneId ? response : null;

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
          console.error('❌ Error guardando dirección en catálogo:', err);
          alert('Hubo un error al registrar la dirección.');
          this.isSavingAddress.set(false);
        }
      });
    }
  }
}
