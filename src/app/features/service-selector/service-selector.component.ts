import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth/auth.service';
import { CustomerService, Address } from '../../core/services/customer/customer.service';
import { MapboxService } from '../../core/services/location/mapbox.service';
import mapboxgl from 'mapbox-gl';

interface Category {
  id: string;
  name: string;
  icon: string;
  route: string;
  available: boolean;
}

@Component({
  selector: 'app-service-selector',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './service-selector.component.html',
  styleUrl: './service-selector.component.scss',
})
export class ServiceSelectorComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  public authService = inject(AuthService);
  private customerService = inject(CustomerService);
  private mapboxService = inject(MapboxService);

  customerName = 'Zisify';
  walletBalance = '950.000';
  ordersCount = 21;
  pointsCount = 56;
  referidosCount = 3;

  categories: Category[] = [
    { id: 'food', name: 'Comida', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png', route: '/food/catalog', available: true },
    { id: 'liquor', name: 'Licores', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779227373/delivery-categories/licuour.png', route: '/liquor/catalog', available: false },
    { id: 'market', name: 'Mercado', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237655/delivery-categories/market.png', route: '/market', available: false },
    { id: 'courier', name: 'Couriers', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237691/delivery-categories/courier.png', route: '/courier', available: false },
    { id: 'pharmacy', name: 'Farmacia', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237706/delivery-categories/farmacy.png', route: '/pharmacy', available: false }
  ];

  promotions = [
    { id: 5, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779233021/interface-assets/banner-hamburguesas.png', title: 'Envío gratis en tu 1er pedido' },
    { id: 6, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779233256/interface-assets/banner-pasta.png', title: 'Referidos - Próximamente' },
    { id: 1, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779232976/interface-assets/banner-polleria.png', title: 'Pollerías - Próximamente' },
    { id: 2, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779233021/interface-assets/banner-hamburguesas.png', title: 'Hamburguesas - Próximamente' },
    { id: 3, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779233256/interface-assets/banner-pasta.png', title: 'Pastas - Próximamente' },
    { id: 4, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779232461/interface-assets/banner-chifa.png', title: 'Chifas - Próximamente' }
  ];

  shortcuts = [
    { id: 'last_order', name: 'Último Pedido', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', route: '/orders' },
    { id: 'favorites', name: 'Favoritos', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', route: '/favorites' },
    { id: 'promos', name: 'Cupones', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', route: '/vouchers' }
  ];

  // Address signals & state
  currentAddress = signal<Address | null>(null);
  customerAddresses = signal<Address[]>([]);
  showAddressModal = signal(false);
  showAddAddressModal = signal(false);

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

  isUrl(icon: string): boolean {
    return icon.startsWith('http');
  }

  ngOnInit() {
    this.customerName = 'Zisify';
    this.loadCustomerProfileAndAddresses();
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
          console.log('🔥 [Sync Backend] Dirección seleccionada tras guardar:', active);
        } else if (!active && addresses.length > 0) {
          active = addresses.find(a => a.isDefault) || addresses[0];
        }

        if (active) {
          console.log('📍 [Estado Activo] Dirección configurada activa con zoneId:', active.zoneId || 'SIN_ZONE_ID');
          this.currentAddress.set(active);
          this.customerService.setActiveAddress(active);
        }
      },
      error: (err) => {
        console.error('❌ Error cargando perfil de cliente en inicio:', err);
      }
    });
  }

  selectCategory(category: Category) {
    if (category.available) {
      this.router.navigate([category.route]);
    }
  }

  clickShortcut(shortcut: any) {
    if (shortcut.id === 'last_order') {
      this.router.navigate([shortcut.route]);
    } else {
      alert(`${shortcut.name} estará disponible próximamente.`);
    }
  }

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
    this.showAddAddressModal.set(true);
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  closeAddAddressModal() {
    this.showAddAddressModal.set(false);
    this.cleanupMap();
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

  private initMap() {
    this.cleanupMap();

    // Default to Huancayo center
    const defaultCenter: [number, number] = [-75.21128, -12.04637];

    try {
      this.map = this.mapboxService.createMap('addressMap', defaultCenter, 14);

      this.map.on('load', () => {
        this.marker = new mapboxgl.Marker({
          draggable: true,
          color: '#22C55E' // Green color for location marker
        })
        .setLngLat(defaultCenter)
        .addTo(this.map!);

        // Initial coords update
        this.updateCoords(defaultCenter[1], defaultCenter[0]);

        // Dragend handler
        this.marker.on('dragend', () => {
          const lngLat = this.marker!.getLngLat();
          this.updateCoords(lngLat.lat, lngLat.lng);
        });

        // Click on map moves marker
        this.map!.on('click', (e) => {
          this.marker!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          this.updateCoords(e.lngLat.lat, e.lngLat.lng);
        });
      });
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  }

  async updateCoords(lat: number, lng: number) {
    this.newLatitude.set(lat);
    this.newLongitude.set(lng);

    // Retrieve address using reverse geocoding
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
          console.error('Error fetching current location:', error);
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

    const newAddr: Address = {
      label: this.newLabel(),
      streetAddress: this.newStreetAddress().trim(),
      reference: this.newReference().trim() || undefined,
      city: this.newCity().toUpperCase(),
      latitude: this.newLatitude(),
      longitude: this.newLongitude(),
      isDefault: true
    };

    console.log('📍 Coordenadas seleccionadas en UI para guardar:', {
      lat: newAddr.latitude,
      lng: newAddr.longitude,
      city: newAddr.city,
      address: newAddr.streetAddress
    });

    this.customerService.addAddress(userId, newAddr).subscribe({
      next: (response) => {
        console.log('✅ POST Exitoso. Respuesta recibida del backend:', response);
        
        let savedAddrWithZone = response && response.zoneId ? response : null;

        if (savedAddrWithZone) {
          console.log('🎯 ZoneID devuelto directamente en el POST:', savedAddrWithZone.zoneId);
          this.currentAddress.set(savedAddrWithZone);
          this.customerService.setActiveAddress(savedAddrWithZone);
        }

        // Reset fields
        this.newStreetAddress.set('');
        this.newReference.set('');
        
        this.showAddAddressModal.set(false);
        this.showAddressModal.set(false);
        this.isSavingAddress.set(false);

        // Refresh customer profile and auto-select newly returned address (with zoneId)
        this.loadCustomerProfileAndAddresses(true);
      },
      error: (err) => {
        console.error('❌ Error guardando dirección en inicio:', err);
        alert('Hubo un error al registrar la dirección.');
        this.isSavingAddress.set(false);
      }
    });
  }
}
