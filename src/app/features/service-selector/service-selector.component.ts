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

export interface CarouselDishItem {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  badge?: string;
  restaurantId: string;
  restaurantName?: string;
}

export interface CategoryCarousel {
  title: string;
  subtitle?: string;
  items: CarouselDishItem[];
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

  readonly womenAvatarUrl = 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1786573894/Gemini_Generated_Image_alg3v6alg3v6alg3_lpa0lo.png';
  readonly menAvatarUrl = 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1786573919/avatar-man_uftrhm.png';

  customerName = 'ZISIFY';
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

  // ✅ 7 CATEGORÍAS SOLICITADAS CON CAROUSELS HORIZONTALES
  categoryCarousels: CategoryCarousel[] = [
    {
      title: 'Prueba nuevas opciones',
      subtitle: 'Novedades gastronómicas seleccionadas para ti',
      items: [
        {
          id: 'dish-001',
          name: 'Tacu Tacu con Lomo Saltado',
          price: 50.60,
          description: 'Tacu Tacu crujiente de frijoles con lomo fino salteado al wok',
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
          badge: 'NUEVO',
          restaurantId: 'rest-001',
          restaurantName: 'El Rico Puerto 82'
        },
        {
          id: 'dish-002',
          name: 'Chicharrón Criollo Especial',
          price: 38.00,
          description: 'Chicharrón doradito con camote frito y salsa criolla de la casa',
          imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80',
          badge: 'RECOMENDADO',
          restaurantId: 'rest-001',
          restaurantName: 'El Rico Puerto 82'
        },
        {
          id: 'dish-003',
          name: 'Causa Rellena de Langostinos',
          price: 32.50,
          description: 'Masa de papa amarilla con langostinos frescos y salsa golf artesanal',
          imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
          badge: 'DELUXE',
          restaurantId: 'rest-002',
          restaurantName: 'La Mar Cevichería'
        },
        {
          id: 'dish-004',
          name: 'Arroz con Mariscos Gratinado',
          price: 42.00,
          description: 'Arroz sazonado al pisco y salteado con mariscos mixtos del Pacífico',
          imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
          badge: 'DESTACADO',
          restaurantId: 'rest-002',
          restaurantName: 'La Mar Cevichería'
        }
      ]
    },
    {
      title: 'Tendencia ahora',
      subtitle: 'Los platillos más pedidos por la comunidad en vivo',
      items: [
        {
          id: 'dish-101',
          name: 'Alita King Broaster',
          price: 10.20,
          description: 'Alita + Papas + Arroz + Ensalada + Cremas ilimitadas',
          imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80',
          badge: '🔥 TENDENCIA',
          restaurantId: 'rest-001',
          restaurantName: 'Broast King'
        },
        {
          id: 'dish-102',
          name: 'Pierna King Crujiente',
          price: 11.20,
          description: 'Pierna frita crocante con receta secreta de especias',
          imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80',
          badge: 'TOP 1',
          restaurantId: 'rest-001',
          restaurantName: 'Broast King'
        },
        {
          id: 'dish-103',
          name: 'Burger Royale Zisify',
          price: 24.90,
          description: 'Doble carne smashed, queso cheddar derretido y tocino crocante',
          imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
          badge: 'POPULAR',
          restaurantId: 'rest-003',
          restaurantName: 'Burger Lab'
        },
        {
          id: 'dish-104',
          name: 'Salchipapa Magna',
          price: 18.50,
          description: 'Papas nativas fritas, frankfurter artesanal y huevo montado',
          imageUrl: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400&q=80',
          badge: 'IMPERDIBLE',
          restaurantId: 'rest-003',
          restaurantName: 'Burger Lab'
        }
      ]
    },
    {
      title: 'Vuelve a pedir',
      subtitle: 'Tus platos favoritos de siempre listos en 1 clic',
      items: [
        {
          id: 'dish-201',
          name: '1/4 Pollo a la Brasa Tradicional',
          price: 19.90,
          description: 'Pollo jugoso al carbón con papas onduladas y crema de ají',
          imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80',
          badge: 'FAVORITO',
          restaurantId: 'rest-001',
          restaurantName: 'Broast King'
        },
        {
          id: 'dish-202',
          name: 'Ceviche Mixto Clásico',
          price: 35.00,
          description: 'Pesca del día con calamar, choclo desgranado y camote dulce',
          imageUrl: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=400&q=80',
          badge: 'REPETIR',
          restaurantId: 'rest-002',
          restaurantName: 'La Mar Cevichería'
        },
        {
          id: 'dish-203',
          name: 'Entrepierna King',
          price: 12.50,
          description: 'Entrepierna horneada y crujiente con papas fritas doradas',
          imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&q=80',
          badge: 'FAVORITO',
          restaurantId: 'rest-001',
          restaurantName: 'Broast King'
        }
      ]
    },
    {
      title: 'Cerca de ti',
      subtitle: 'Opciones de restaurantes en tu zona con delivery ultra rápido',
      items: [
        {
          id: 'dish-301',
          name: 'Chaufa de Mariscos al Wok',
          price: 29.90,
          description: 'Arroz chaufa salteado a fuego vivo con mariscos y cebollita china',
          imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
          badge: 'CERCA (15 MIN)',
          restaurantId: 'rest-002',
          restaurantName: 'La Mar Cevichería'
        },
        {
          id: 'dish-302',
          name: 'Sopa Criolla Reconfortante',
          price: 22.00,
          description: 'Caldo denso de res con fideos, tostadas y huevo escalfado',
          imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
          badge: 'CALIENTE',
          restaurantId: 'rest-001',
          restaurantName: 'Broast King'
        },
        {
          id: 'dish-303',
          name: 'Mostrito Especial Zisify',
          price: 26.50,
          description: '1/4 Pollo a la brasa + Arroz chaufa salteado + Papas crujientes',
          imageUrl: 'https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?w=400&q=80',
          badge: 'SUPER COMBO',
          restaurantId: 'rest-001',
          restaurantName: 'Broast King'
        }
      ]
    },
    {
      title: 'Ofertas del día',
      subtitle: 'Descuentos exclusivos y combos imperdibles hoy',
      items: [
        {
          id: 'dish-401',
          name: 'Combo Familiar Broaster',
          price: 49.90,
          description: '8 Piezas de pollo broaster + Papa familiar + Gaseosa 1.5L',
          imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400&q=80',
          badge: 'OFERTA -30%',
          restaurantId: 'rest-001',
          restaurantName: 'Broast King'
        },
        {
          id: 'dish-402',
          name: 'Dúo Hamburguesas Clásicas',
          price: 29.90,
          description: '2 Hamburguesas artesanales con queso + Papas familiares',
          imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80',
          badge: '2x1 PROMO',
          restaurantId: 'rest-003',
          restaurantName: 'Burger Lab'
        },
        {
          id: 'dish-403',
          name: 'Combo Marino Parrillero',
          price: 55.00,
          description: 'Ceviche Mixto + Chicharrón de Pescado + Arroz con Mariscos',
          imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80',
          badge: 'OFERTAZAS',
          restaurantId: 'rest-002',
          restaurantName: 'La Mar Cevichería'
        }
      ]
    },
    {
      title: 'Los mejor calificados',
      subtitle: 'Platos con puntuación 5.0 estrellas por clientes',
      items: [
        {
          id: 'dish-501',
          name: 'Lomo Saltado Gourmet 5.0★',
          price: 48.00,
          description: 'Lomo fino de res salteado con cebollas, tomates y papas nativas',
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
          badge: '⭐ 5.0 (500+)',
          restaurantId: 'rest-001',
          restaurantName: 'El Rico Puerto 82'
        },
        {
          id: 'dish-502',
          name: 'Ceviche de Lenguado Puro',
          price: 42.00,
          description: 'Lenguado silvestre bañado en leche de tigre de ají mochero',
          imageUrl: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=400&q=80',
          badge: '⭐ 4.9 (320+)',
          restaurantId: 'rest-002',
          restaurantName: 'La Mar Cevichería'
        },
        {
          id: 'dish-503',
          name: 'Chicken Club Sandwich',
          price: 21.00,
          description: 'Triple piso con pechuga deshilachada, tocino ahumado y huevo',
          imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
          badge: '⭐ 4.9 (210+)',
          restaurantId: 'rest-003',
          restaurantName: 'Burger Lab'
        }
      ]
    },
    {
      title: 'Para compartir',
      subtitle: 'Porciones generosas ideales para grupo o familia',
      items: [
        {
          id: 'dish-601',
          name: 'Fuente Marina Familiar',
          price: 79.90,
          description: 'Ceviche Mixto + Arroz con Mariscos + Chicharrón de Pescado + Causa',
          imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
          badge: 'FAMILIAR (4-5 PERSONAS)',
          restaurantId: 'rest-002',
          restaurantName: 'La Mar Cevichería'
        },
        {
          id: 'dish-602',
          name: 'Rueda de Bocaditos Criollos',
          price: 65.00,
          description: 'Anticuchos + Chicharrones + Tamalitos + Tequeños crujientes',
          imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
          badge: 'COMBO GRUPAL',
          restaurantId: 'rest-001',
          restaurantName: 'El Rico Puerto 82'
        },
        {
          id: 'dish-603',
          name: 'Mega Tabla de Hamburguesas',
          price: 59.90,
          description: '4 Mini burgers variadas + Papas nativas + 4 salsas de la casa',
          imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80',
          badge: 'PARTY BOX',
          restaurantId: 'rest-003',
          restaurantName: 'Burger Lab'
        }
      ]
    }
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
    this.customerName = 'ZISIFY';
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

  // ✅ NAVEGACIÓN DIRECTA AL PLATILLO EN EL RESTAURANTE Y APERTURA DE MODAL
  onDishCardClick(dish: CarouselDishItem) {
    const restId = dish.restaurantId || 'rest-001';
    // Enrutamiento directo: primero a comida (ServiceSelector) -> restaurante -> abre modal del platillo
    this.router.navigate(['/food/restaurant', restId], {
      queryParams: { dishId: dish.id }
    });
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
