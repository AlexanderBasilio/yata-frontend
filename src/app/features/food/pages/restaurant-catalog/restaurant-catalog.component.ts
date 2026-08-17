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
import mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-restaurant-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, RestaurantCardComponent, FormsModule],
  templateUrl: './restaurant-catalog.component.html',
  styleUrl: './restaurant-catalog.component.scss'
})
export class RestaurantCatalogComponent implements OnInit, OnDestroy {
  private restaurantService = inject(RestaurantService);
  private customerService = inject(CustomerService);
  public authService = inject(AuthService);
  private mapboxService = inject(MapboxService);
  private router = inject(Router);

  restaurants = signal<Restaurant[]>([]);
  filteredRestaurants = signal<Restaurant[]>([]);
  specialties = signal<Specialty[]>([]);
  selectedSpecialty = signal<string | null>(null);
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
  newCity = signal('HUANCAYO');
  newLatitude = signal(-12.04637);
  newLongitude = signal(-75.21128);
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
        if (address) {
          this.currentAddress.set(address);
          if (address.zoneId) {
            console.log('🌍 ZoneID activo detectado:', address.zoneId);
            this.customerZoneId.set(address.zoneId);
          } else {
            console.warn('⚠️ La dirección activa NO contiene zoneId. Usando fallback:', this.customerZoneId());
          }
        } else {
          console.warn('⚠️ No hay dirección activa. Usando fallback:', this.customerZoneId());
        }
        console.groupEnd();
        this.loadRestaurants(this.customerZoneId());
      }
    });
  }

  ngOnDestroy() {
    this.cleanupMap();
  }

  loadCustomerProfileAndAddresses(forceNewest: boolean = false) {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.customerService.getCustomerProfile(userId).subscribe({
      next: (profile) => {
        const addresses = profile.addresses || [];
        this.customerAddresses.set(addresses);
        
        let active = forceNewest ? null : this.customerService.getActiveAddress();
        
        if (forceNewest && addresses.length > 0) {
          active = addresses.find(a => a.isDefault) || addresses[addresses.length - 1];
          console.log('🔥 [Sync Backend - Food] Dirección seleccionada tras guardar:', active);
        } else if (!active && addresses.length > 0) {
          active = addresses.find(a => a.isDefault) || addresses[0];
        }

        if (active) {
          console.log('📍 [Estado Activo - Food] Dirección configurada activa con zoneId:', active.zoneId || 'SIN_ZONE_ID');
          this.currentAddress.set(active);
          this.customerService.setActiveAddress(active);
        }
      },
      error: (err) => {
        console.error('❌ Error cargando perfil de cliente en catálogo:', err);
      }
    });
  }

  loadRestaurants(zoneId: string) {
    this.isLoading.set(true);
    this.restaurantService.getAllRestaurants(zoneId).subscribe({
      next: (restaurants) => {
        console.log('✅ Catálogo recibido para zona ' + zoneId + ':', restaurants);
        this.restaurants.set(restaurants);
        this.filteredRestaurants.set(restaurants);
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

  filterBySpecialty(specialty: string) {
    if (this.selectedSpecialty() === specialty) {
      // Deseleccionar
      this.selectedSpecialty.set(null);
      this.filteredRestaurants.set(this.restaurants());
    } else {
      // Seleccionar y filtrar
      this.selectedSpecialty.set(specialty);
      this.restaurantService.searchBySpecialty(this.customerZoneId(), specialty).subscribe({
        next: (restaurants) => {
          console.log(`🔍 Catálogo con especialidad "${specialty}":`, restaurants);
          this.filteredRestaurants.set(restaurants);
        },
        error: (err) => {
          console.error('Error filtrando catálogo:', err);
          this.filteredRestaurants.set([]);
        }
      });
    }
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchQuery.set(query);

    if (!query) {
      this.filteredRestaurants.set(this.restaurants());
      return;
    }

    // ✅ Buscar en el array de specialties
    const filtered = this.restaurants().filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.specialties.some(s => s.name.toLowerCase().includes(query))
    );
    this.filteredRestaurants.set(filtered);
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
    this.newCity.set('HUANCAYO');
    this.newLatitude.set(-12.04637);
    this.newLongitude.set(-75.21128);
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
    this.newCity.set(address.city || 'HUANCAYO');
    this.newLatitude.set(address.latitude || -12.04637);
    this.newLongitude.set(address.longitude || -75.21128);
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

    const lat = initialLat || -12.04637;
    const lng = initialLng || -75.21128;
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
