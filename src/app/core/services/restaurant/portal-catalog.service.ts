import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SpecialtyItemResponse {
  name: string;
  orderIndex?: number;
}

export interface RestaurantSummaryResponse {
  id: string;
  name: string;
  slogan?: string;
  rating?: number;
  preparationTime?: number;
  imageUrl?: string;
  logoUrl?: string;
  isActive?: boolean;
  isTemporarilyClosed?: boolean;
  isOpen?: boolean;
  specialties?: SpecialtyItemResponse[];
}

export interface DishHomeSummaryResponse {
  id: string; // UUID
  restaurantId: string; // UUID
  restaurantName?: string;
  name: string;
  description?: string;
  price: number; // BigDecimal
  listPrice?: number; // 🎯 NUEVO: Precio de lista (tachado)
  imageUrl?: string;
  isAvailable?: boolean;
}

export interface RestaurantSectionDto {
  title: string;
  subtitle: string;
  items: RestaurantSummaryResponse[];
}

export interface DishSectionDto {
  title: string;
  subtitle: string;
  items: DishHomeSummaryResponse[];
}

export interface AddressDto {
  id?: number;
  label?: string;
  streetAddress?: string;
  reference?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  zoneId?: string;
}

export interface CustomerHeaderSummaryDto {
  customerName?: string;       // Ej: "Carlos" / "Emilio"
  currentIdentity?: string;    // Ej: "KALLPA" o "SAMI" o null
  defaultAddress?: AddressDto;  // Dirección seleccionada
  totalOrders?: number;       // Contador histórico de pedidos
  zisiCoins?: number;         // Balance de Zisi-Coins
  referrals?: string;        // Referidos (mock "0")
}

export interface HomeShortcutSectionsResponse {
  headerSummaryDto?: CustomerHeaderSummaryDto;
  nearbySection: RestaurantSectionDto;
  newOptionsSection: RestaurantSectionDto;
  reorderSection: DishSectionDto;
  trendingSection: DishSectionDto;
}

@Injectable({
  providedIn: 'root'
})
export class PortalCatalogService {
  private http = inject(HttpClient);

  private get portalApiUrl(): string {
    const rawUrl = environment.portalUrl || 'https://zisify-portal-production-b174.up.railway.app/api/v1';
    return rawUrl;
  }

  /**
   * ⚡ GET /api/v1/portal/catalog/home-shortcuts?customerZoneId={customerZoneId}&userId={userId}
   * Exclusivo para la pantalla principal (Atajos ligeros)
   */
  getHomeShortcuts(customerZoneId: string, userId?: string): Observable<HomeShortcutSectionsResponse> {
    let params = new HttpParams().set('customerZoneId', customerZoneId || 'HYO_GRID_120_84');
    if (userId) {
      params = params.set('userId', userId);
    }

    const url = `${this.portalApiUrl}/portal/catalog/home-shortcuts`;
    console.group('⚡ [GET HTTP] Consultando Atajos de Inicio (Home Shortcuts)');
    console.log('🌐 Endpoint URL:', url);
    console.log('📍 customerZoneId:', customerZoneId);
    if (userId) console.log('👤 userId:', userId);
    console.groupEnd();

    return this.http.get<HomeShortcutSectionsResponse>(url, { params }).pipe(
      tap(res => {
        console.group('📥 [GET RESPONSE] Home Shortcuts recibidos del Portal');
        console.log('📦 JSON:', res);
        console.groupEnd();
      }),
      catchError(err => {
        console.warn('⚠️ No se pudieron obtener home-shortcuts del portal:', err);
        return of({
          headerSummaryDto: {
            customerName: '',
            currentIdentity: 'NONE',
            defaultAddress: undefined,
            totalOrders: 0,
            zisiCoins: 0,
            referrals: '0'
          },
          nearbySection: {
            title: 'Cerca de ti',
            subtitle: 'Restaurantes en tu zona con delivery ultra rápido',
            items: []
          },
          newOptionsSection: {
            title: 'Prueba nuevas opciones',
            subtitle: 'Novedades gastronómicas en tu ciudad',
            items: []
          },
          reorderSection: {
            title: 'Vuelve a pedir',
            subtitle: 'Tus platos favoritos de siempre',
            items: []
          },
          trendingSection: {
            title: 'Tendencias',
            subtitle: 'Los más pedidos de la semana',
            items: []
          }
        });
      })
    );
  }

  // Fallback estructurado con las 4 secciones exactas requeridas
  private getMockHomeShortcuts(): HomeShortcutSectionsResponse {
    return {
      headerSummaryDto: {
        customerName: 'Carlos',
        currentIdentity: 'KALLPA',
        defaultAddress: {
          id: 101,
          label: 'Casa',
          streetAddress: 'Avenida A 10, Lima, Lima ...',
          city: 'LIMA',
          isDefault: true,
          zoneId: 'HYO_GRID_120_84'
        },
        totalOrders: 21,
        zisiCoins: 56,
        referrals: '0'
      },
      nearbySection: {
        title: 'Cerca de ti',
        subtitle: 'Restaurantes en tu zona con delivery ultra rápido',
        items: [
          {
            id: 'rest-001',
            name: 'El Rico Puerto 82',
            slogan: 'Auténtica sazón marina y criolla al wok',
            rating: 4.9,
            preparationTime: 15,
            imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80',
            logoUrl: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png',
            isOpen: true,
            isActive: true,
            isTemporarilyClosed: false,
            specialties: [{ name: 'Marisquería', orderIndex: 1 }, { name: 'Criolla', orderIndex: 2 }]
          },
          {
            id: 'rest-002',
            name: 'Broast King & Grill',
            slogan: 'El pollo crocante y jugoso más pedido de la zona',
            rating: 4.8,
            preparationTime: 20,
            imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80',
            logoUrl: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png',
            isOpen: true,
            isActive: true,
            isTemporarilyClosed: false,
            specialties: [{ name: 'Pollería', orderIndex: 1 }, { name: 'Frituras y Crocantes', orderIndex: 2 }]
          },
          {
            id: 'rest-003',
            name: 'Chifa Dragón Dorado',
            slogan: 'Wok al fuego vivo y combinados especiales',
            rating: 4.7,
            preparationTime: 18,
            imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
            logoUrl: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png',
            isOpen: true,
            isActive: true,
            isTemporarilyClosed: false,
            specialties: [{ name: 'Chifa', orderIndex: 1 }]
          },
          {
            id: 'rest-004',
            name: 'Parrillas & Brasas Huancayo',
            slogan: 'Cortes premium y anticuchos con receta tradicional',
            rating: 4.9,
            preparationTime: 25,
            imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80',
            logoUrl: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png',
            isOpen: true,
            isActive: true,
            isTemporarilyClosed: false,
            specialties: [{ name: 'Tradicional', orderIndex: 1 }]
          }
        ]
      },
      newOptionsSection: {
        title: 'Prueba nuevas opciones',
        subtitle: 'Novedades gastronómicas en tu ciudad',
        items: [
          {
            id: 'rest-005',
            name: 'Burger Lab Artisanal',
            slogan: 'Smash burgers de carne madurada y papas nativas',
            rating: 4.8,
            preparationTime: 20,
            imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
            logoUrl: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png',
            isOpen: true,
            isActive: true,
            isTemporarilyClosed: false,
            specialties: [{ name: 'Frituras y Crocantes', orderIndex: 1 }]
          },
          {
            id: 'rest-006',
            name: 'La Nonna Pizzería Napolitana',
            slogan: 'Masa madre horneada a 450° con mozzarella fior di latte',
            rating: 4.9,
            preparationTime: 22,
            imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&q=80',
            logoUrl: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png',
            isOpen: true,
            isActive: true,
            isTemporarilyClosed: false,
            specialties: [{ name: 'Pizzería', orderIndex: 1 }]
          },
          {
            id: 'rest-007',
            name: 'Maki House Nikkei',
            slogan: 'Rolls acevichados y bowls frescos con toques peruanos',
            rating: 4.7,
            preparationTime: 20,
            imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&q=80',
            logoUrl: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png',
            isOpen: true,
            isActive: true,
            isTemporarilyClosed: false,
            specialties: [{ name: 'Nikkei', orderIndex: 1 }]
          }
        ]
      },
      reorderSection: {
        title: 'Vuelve a pedir',
        subtitle: 'Tus platillos favoritos a un solo tap',
        items: [
          {
            id: 'b1a2c3d4-1111-4444-aaaa-000000000001',
            restaurantId: 'rest-002',
            restaurantName: 'Broast King & Grill',
            name: '1/4 Pollo a la Brasa Tradicional',
            description: 'Pollo jugoso al carbón con papas onduladas y crema de ají',
            price: 19.90,
            listPrice: 24.90,
            imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80',
            isAvailable: true
          },
          {
            id: 'b1a2c3d4-2222-4444-aaaa-000000000002',
            restaurantId: 'rest-001',
            restaurantName: 'El Rico Puerto 82',
            name: 'Ceviche Mixto Clásico',
            description: 'Pesca del día con calamar, choclo desgranado y camote dulce',
            price: 35.00,
            listPrice: 42.00,
            imageUrl: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=400&q=80',
            isAvailable: true
          },
          {
            id: 'b1a2c3d4-3333-4444-aaaa-000000000003',
            restaurantId: 'rest-003',
            restaurantName: 'Chifa Dragón Dorado',
            name: 'Arroz Chaufa Especial al Wok',
            description: 'Chaufa con trozos de pollo, lomo salteado y cebollita china',
            price: 22.50,
            imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
            isAvailable: true
          }
        ]
      },
      trendingSection: {
        title: 'Tendencias',
        subtitle: 'Lo más pedido cerca de ti',
        items: [
          {
            id: 't1a2c3d4-1111-4444-bbbb-000000000001',
            restaurantId: 'rest-002',
            restaurantName: 'Broast King & Grill',
            name: 'Alita King Broaster Crocante',
            description: 'Alita + Papas nativas + Arroz + Ensalada + Cremas ilimitadas',
            price: 10.20,
            listPrice: 12.50,
            imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80',
            isAvailable: true
          },
          {
            id: 't1a2c3d4-2222-4444-bbbb-000000000002',
            restaurantId: 'rest-002',
            restaurantName: 'Broast King & Grill',
            name: 'Pierna King Crujiente Especial',
            description: 'Pierna frita crocante con receta secreta de especias peruanas',
            price: 11.20,
            imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80',
            isAvailable: true
          },
          {
            id: 't1a2c3d4-3333-4444-bbbb-000000000003',
            restaurantId: 'rest-005',
            restaurantName: 'Burger Lab Artisanal',
            name: 'Burger Royale Doble Smashed',
            description: 'Doble carne smashed, queso cheddar derretido y tocino ahumado',
            price: 24.90,
            listPrice: 30.00,
            imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
            isAvailable: true
          },
          {
            id: 't1a2c3d4-4444-4444-bbbb-000000000004',
            restaurantId: 'rest-001',
            restaurantName: 'El Rico Puerto 82',
            name: 'Tacu Tacu con Lomo Saltado',
            description: 'Tacu Tacu de frijol canario con lomo fino flameado al pisco',
            price: 50.60,
            listPrice: 58.00,
            imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
            isAvailable: true
          }
        ]
      }
    };
  }
}
