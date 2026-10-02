import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MarketCategoryCustomerDto,
  MarketSectionCustomerDto,
  MarketStoreProductCustomerDto,
  MarketStoreSummaryDto
} from '../../models/market.model';

@Injectable({
  providedIn: 'root'
})
export class MarketCatalogService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/market/customer/catalog`;

  // Fallback demo sections aligned with Image 1 & 2
  private readonly fallbackSections: MarketSectionCustomerDto[] = [
    {
      id: 'sec-verduras',
      name: 'Verduras',
      slug: 'verduras',
      description: 'Verduras frescas de chacra seleccionadas',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80',
      iconUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100&q=80',
      displayOrder: 1
    },
    {
      id: 'sec-frutas',
      name: 'Frutas',
      slug: 'frutas',
      description: 'Frutas dulces y de temporada',
      imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&q=80',
      iconUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=100&q=80',
      displayOrder: 2
    },
    {
      id: 'sec-lacteos',
      name: 'Lácteos',
      slug: 'lacteos',
      description: 'Leches, quesos andinos, yogures y mantequillas',
      imageUrl: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=300&q=80',
      iconUrl: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=100&q=80',
      displayOrder: 3
    },
    {
      id: 'sec-abarrotes',
      name: 'Abarrotes',
      slug: 'abarrotes',
      description: 'Arroz, azúcar, fideos, conservas y aceites',
      imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300&q=80',
      iconUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&q=80',
      displayOrder: 4
    },
    {
      id: 'sec-pollo',
      name: 'Pollo',
      slug: 'pollo',
      description: 'Pollo fresco del día, pechuga, piernas y vísceras',
      imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=300&q=80',
      iconUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=100&q=80',
      displayOrder: 5
    },
    {
      id: 'sec-carnes',
      name: 'Carnes',
      slug: 'carnes',
      description: 'Carne de res tierna, lomo, bistec y chuletas',
      imageUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=300&q=80',
      iconUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=100&q=80',
      displayOrder: 6
    }
  ];

  // Fallback demo stores aligned with Image 1
  private readonly fallbackStores: MarketStoreSummaryDto[] = [
    {
      id: 'store-001',
      name: 'Abarrotes Don Pepe',
      slug: 'abarrotes-don-pepe',
      description: 'Tu bodega de confianza con los mejores precios del mercado',
      coverImageUrl: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200&q=80',
      district: 'El Tambo',
      address: 'Jirón Junín 450',
      city: 'Huancayo',
      isOpen: true,
      rating: 4.8,
      reviewsCount: 120,
      estimatedDeliveryMinutes: '30-45 min',
      distanceMeters: 450,
      openingTime: '7:00 AM',
      closingTime: '10:00 PM',
      sections: [
        { id: 'sec-abarrotes', name: 'Abarrotes' },
        { id: 'sec-lacteos', name: 'Lácteos' }
      ]
    },
    {
      id: 'store-002',
      name: 'Bodega Milagros',
      slug: 'bodega-milagros',
      description: 'Lácteos frescos, quesos artesanales y abarrotes seleccionados',
      coverImageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=200&q=80',
      district: 'El Tambo',
      address: 'Av. Huancavelica 1024',
      city: 'Huancayo',
      isOpen: true,
      rating: 4.9,
      reviewsCount: 185,
      estimatedDeliveryMinutes: '30-45 min',
      distanceMeters: 650,
      openingTime: '6:30 AM',
      closingTime: '9:30 PM',
      sections: [
        { id: 'sec-lacteos', name: 'Lácteos' },
        { id: 'sec-abarrotes', name: 'Abarrotes' },
        { id: 'sec-frutas', name: 'Frutas' }
      ]
    },
    {
      id: 'store-003',
      name: 'Frutería La Loma',
      slug: 'fruteria-la-loma',
      description: 'Frutas frescas del valle y verduras directamente del productor',
      coverImageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&q=80',
      district: 'El Tambo',
      address: 'Jirón Junín 450',
      city: 'Huancayo',
      isOpen: true,
      rating: 4.7,
      reviewsCount: 94,
      estimatedDeliveryMinutes: '25-35 min',
      distanceMeters: 320,
      openingTime: '7:00 AM',
      closingTime: '10:00 PM',
      sections: [
        { id: 'sec-frutas', name: 'Frutas' },
        { id: 'sec-verduras', name: 'Verduras' }
      ]
    },
    {
      id: 'store-004',
      name: 'Carnicería El Cholo',
      slug: 'carniceria-el-cholo',
      description: 'Cortes finos de res, cerdo y pollo tierno garantizado',
      coverImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=200&q=80',
      district: 'Huancayo',
      address: 'Jirón Junín 450',
      city: 'Huancayo',
      isOpen: true,
      rating: 4.8,
      reviewsCount: 142,
      estimatedDeliveryMinutes: '35-50 min',
      distanceMeters: 780,
      openingTime: '7:00 AM',
      closingTime: '8:00 PM',
      sections: [
        { id: 'sec-carnes', name: 'Carnes' },
        { id: 'sec-pollo', name: 'Pollo' }
      ]
    }
  ];

  // 1. Ver ruleta/columna de secciones disponibles
  listActiveSections(
    zoneIds?: string[],
    lat?: number,
    lng?: number
  ): Observable<MarketSectionCustomerDto[]> {
    let params = new HttpParams();
    if (zoneIds && zoneIds.length > 0) {
      zoneIds.forEach(z => (params = params.append('zones', z)));
    }
    if (lat !== undefined && lat !== null) params = params.set('lat', lat.toString());
    if (lng !== undefined && lng !== null) params = params.set('lng', lng.toString());

    return this.http.get<MarketSectionCustomerDto[]>(`${this.baseUrl}/sections`, { params }).pipe(
      map(sections => (sections && sections.length > 0 ? sections : this.fallbackSections)),
      catchError(err => {
        console.warn('⚠️ Error en listActiveSections, usando fallback local:', err);
        return of(this.fallbackSections);
      })
    );
  }

  // 2. Ver ruleta de comercios de mercado
  listStores(
    zoneIds?: string[],
    sectionId?: string,
    lat?: number,
    lng?: number,
    search?: string
  ): Observable<MarketStoreSummaryDto[]> {
    let params = new HttpParams();
    if (zoneIds && zoneIds.length > 0) {
      zoneIds.forEach(z => (params = params.append('zones', z)));
    }
    if (sectionId) params = params.set('sectionId', sectionId);
    if (lat !== undefined && lat !== null) params = params.set('lat', lat.toString());
    if (lng !== undefined && lng !== null) params = params.set('lng', lng.toString());
    if (search) params = params.set('search', search);

    return this.http.get<MarketStoreSummaryDto[]>(`${this.baseUrl}/stores`, { params }).pipe(
      map(stores => {
        if (stores && stores.length > 0) {
          return stores;
        }
        return this.filterFallbackStores(sectionId, search);
      }),
      catchError(err => {
        console.warn('⚠️ Error en listStores, usando fallback local:', err);
        return of(this.filterFallbackStores(sectionId, search));
      })
    );
  }

  private filterFallbackStores(sectionId?: string, search?: string): MarketStoreSummaryDto[] {
    let list = [...this.fallbackStores];
    if (sectionId) {
      list = list.filter(s => s.sections?.some(sec => sec.id === sectionId));
    }
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.district?.toLowerCase().includes(q));
    }
    return list;
  }

  // 3. Obtener cabecera completa del comercio
  getStoreDetail(storeId: string, lat?: number, lng?: number): Observable<MarketStoreSummaryDto> {
    let params = new HttpParams();
    if (lat !== undefined && lat !== null) params = params.set('lat', lat.toString());
    if (lng !== undefined && lng !== null) params = params.set('lng', lng.toString());

    return this.http.get<MarketStoreSummaryDto>(`${this.baseUrl}/stores/${storeId}`, { params }).pipe(
      map(store => store || this.fallbackStores.find(s => s.id === storeId) || this.fallbackStores[0]),
      catchError(err => {
        console.warn(`⚠️ Error en getStoreDetail (${storeId}), usando fallback:`, err);
        const found = this.fallbackStores.find(s => s.id === storeId) || this.fallbackStores[0];
        return of(found);
      })
    );
  }

  // 4. Ver secciones que vende este comercio
  listStoreSections(storeId: string): Observable<MarketSectionCustomerDto[]> {
    return this.http.get<MarketSectionCustomerDto[]>(`${this.baseUrl}/stores/${storeId}/sections`).pipe(
      map(sections => (sections && sections.length > 0 ? sections : this.fallbackSections)),
      catchError(() => of(this.fallbackSections))
    );
  }

  // 5. Ver categorías de una sección en este comercio
  listStoreCategories(storeId: string, sectionId: string): Observable<MarketCategoryCustomerDto[]> {
    return this.http
      .get<MarketCategoryCustomerDto[]>(
        `${this.baseUrl}/stores/${storeId}/sections/${sectionId}/categories`
      )
      .pipe(
        map(categories => {
          if (categories && categories.length > 0) return categories;
          return this.getFallbackCategories(sectionId);
        }),
        catchError(() => of(this.getFallbackCategories(sectionId)))
      );
  }

  // 6. Ver catálogo de productos de una tienda
  listProductsByStore(
    storeId: string,
    sectionId?: string,
    categoryId?: string,
    search?: string
  ): Observable<MarketStoreProductCustomerDto[]> {
    let params = new HttpParams();
    if (sectionId) params = params.set('sectionId', sectionId);
    if (categoryId) params = params.set('categoryId', categoryId);
    if (search) params = params.set('search', search);

    return this.http
      .get<MarketStoreProductCustomerDto[]>(`${this.baseUrl}/stores/${storeId}/products`, { params })
      .pipe(
        map(products => {
          if (products && products.length > 0) return products;
          return this.getFallbackProducts(storeId, sectionId, categoryId, search);
        }),
        catchError(err => {
          console.warn('⚠️ Error en listProductsByStore, usando fallback:', err);
          return of(this.getFallbackProducts(storeId, sectionId, categoryId, search));
        })
      );
  }

  // 7. Productos más demandados de mercado en la zona
  getTrendingProducts(zoneIds?: string[]): Observable<MarketStoreProductCustomerDto[]> {
    let params = new HttpParams();
    if (zoneIds && zoneIds.length > 0) {
      zoneIds.forEach(z => (params = params.append('zones', z)));
    }
    return this.http
      .get<MarketStoreProductCustomerDto[]>(`${this.baseUrl}/home/trending-products`, { params })
      .pipe(
        map(res => (res && res.length > 0 ? res : this.getFallbackProducts('store-001'))),
        catchError(() => of(this.getFallbackProducts('store-001')))
      );
  }

  // 8. Comercios de mercado en la zona exacta
  getNearbyStores(zoneId?: string): Observable<MarketStoreSummaryDto[]> {
    let params = new HttpParams();
    if (zoneId) params = params.set('zoneId', zoneId);
    return this.http.get<MarketStoreSummaryDto[]>(`${this.baseUrl}/home/nearby-stores`, { params }).pipe(
      map(res => (res && res.length > 0 ? res : this.fallbackStores)),
      catchError(() => of(this.fallbackStores))
    );
  }

  // Fallback categories generator
  private getFallbackCategories(sectionId: string): MarketCategoryCustomerDto[] {
    const list: MarketCategoryCustomerDto[] = [
      { id: 'cat-lacteos', sectionId, name: 'Lácteos' },
      { id: 'cat-arroz', sectionId, name: 'Arroz' },
      { id: 'cat-azucar', sectionId, name: 'Azúcar' },
      { id: 'cat-menestras', sectionId, name: 'Menestras' },
      { id: 'cat-cereales', sectionId, name: 'Cereales' },
      { id: 'cat-fideos', sectionId, name: 'Fideos' },
      { id: 'cat-cafe', sectionId, name: 'Café' },
      { id: 'cat-te', sectionId, name: 'Té' },
      { id: 'cat-snacks', sectionId, name: 'Snacks' },
      { id: 'cat-salsas', sectionId, name: 'Salsas' },
      { id: 'cat-conservas', sectionId, name: 'Conservas' },
      { id: 'cat-aceites', sectionId, name: 'Aceites' }
    ];
    return list;
  }

  // Fallback products generator (exact matches for Image 2)
  private getFallbackProducts(
    storeId: string,
    sectionId?: string,
    categoryId?: string,
    search?: string
  ): MarketStoreProductCustomerDto[] {
    const demoProducts: MarketStoreProductCustomerDto[] = [
      {
        storeProductId: 'sp-001',
        storeId,
        storeName: 'Bodega Milagros',
        productId: 'prod-001',
        productName: 'Leche Gloria',
        productSlug: 'leche-gloria-1l',
        description: 'Leche entera evaporada enriquecida con vitaminas A y D.',
        brandName: 'Gloria',
        measurementType: 'UNIT',
        pricingMode: 'FIXED',
        priceUnit: 'UNIT',
        hasVariants: false,
        primaryImageUrl: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1788979800/products/leche-gloria-azul.png',
        primaryPrice: 5.20,
        primaryPriceUnit: 'UNIT',
        allowsDirectQuickAdd: true,
        isAvailable: true,
        variants: [
          { id: 'var-1l', name: '1 litro', price: 5.20, isAvailable: true },
          { id: 'var-400g', name: 'Lata 400g', price: 4.30, isAvailable: true }
        ]
      },
      {
        storeProductId: 'sp-002',
        storeId,
        storeName: 'Bodega Milagros',
        productId: 'prod-002',
        productName: 'Yogurt natural',
        productSlug: 'yogurt-natural',
        description: 'Yogurt natural batido con probióticos activos.',
        brandName: 'Gloria',
        measurementType: 'UNIT',
        pricingMode: 'FIXED',
        priceUnit: 'UNIT',
        hasVariants: false,
        primaryImageUrl: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400&q=80',
        primaryPrice: 2.90,
        primaryPriceUnit: 'UNIT',
        allowsDirectQuickAdd: true,
        isAvailable: true
      },
      {
        storeProductId: 'sp-003',
        storeId,
        storeName: 'Bodega Milagros',
        productId: 'prod-003',
        productName: 'Queso fresco',
        productSlug: 'queso-fresco-artesanal',
        description: 'Queso fresco pasteurizado artesanal de Concepción.',
        brandName: 'Artesanal Mantaro',
        measurementType: 'KG',
        pricingMode: 'WEIGHT_BASED',
        priceUnit: 'KG',
        hasVariants: true,
        primaryImageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80',
        primaryPrice: 4.50,
        primaryPriceUnit: 'KG',
        allowsDirectQuickAdd: false, // Opens modal for weight/cut selection
        isAvailable: true,
        variants: [
          { id: 'var-q-250', name: '250g (Porción chica)', price: 4.50 },
          { id: 'var-q-500', name: '500g (Medio molde)', price: 8.90 },
          { id: 'var-q-1000', name: '1 Kg (Molde entero)', price: 17.50 }
        ],
        optionGroups: [
          {
            id: 'og-corte',
            name: 'Tipo de corte / presentación',
            isRequired: true,
            options: [
              { id: 'opt-entero', name: 'Bloque entero', additionalPrice: 0 },
              { id: 'opt-tajadas', name: 'En tajadas para sándwich', additionalPrice: 0 }
            ]
          }
        ]
      },
      {
        storeProductId: 'sp-004',
        storeId,
        storeName: 'Bodega Milagros',
        productId: 'prod-004',
        productName: 'Pechuga de Pollo Fresca',
        productSlug: 'pechuga-pollo-fresca',
        description: 'Pechuga de pollo fresca, tierna y limpia.',
        brandName: 'San Fernando',
        measurementType: 'KG',
        pricingMode: 'WEIGHT_BASED',
        priceUnit: 'KG',
        hasVariants: false,
        primaryImageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80',
        primaryPrice: 12.80,
        primaryPriceUnit: 'KG',
        allowsDirectQuickAdd: false, // Opens modal for weight and cut
        isAvailable: true,
        optionGroups: [
          {
            id: 'og-corte-pollo',
            name: 'Tipo de corte',
            isRequired: true,
            options: [
              { id: 'opt-filete', name: 'En filetes delgados', additionalPrice: 0 },
              { id: 'opt-trozos', name: 'Trozado para guiso', additionalPrice: 0 },
              { id: 'opt-entera', name: 'Pechuga entera con hueso', additionalPrice: 0 }
            ]
          }
        ]
      },
      {
        storeProductId: 'sp-005',
        storeId,
        storeName: 'Bodega Milagros',
        productId: 'prod-005',
        productName: 'Papaya Arequipeña',
        productSlug: 'papaya-arequipena',
        description: 'Papaya dulce y aromática especial para jugos.',
        brandName: 'Frutas del Valle',
        measurementType: 'UNIT',
        pricingMode: 'FIXED',
        priceUnit: 'UNIT',
        hasVariants: true,
        primaryImageUrl: 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=400&q=80',
        primaryPrice: 3.80,
        primaryPriceUnit: 'UNIT',
        allowsDirectQuickAdd: false, // Has size variants (small, medium, large)
        isAvailable: true,
        variants: [
          { id: 'var-papaya-peq', name: 'Pequeña (aprox 1kg)', price: 3.80 },
          { id: 'var-papaya-med', name: 'Mediana (aprox 1.8kg)', price: 5.50 },
          { id: 'var-papaya-gde', name: 'Grande (aprox 2.5kg)', price: 7.20 }
        ]
      },
      {
        storeProductId: 'sp-006',
        storeId,
        storeName: 'Bodega Milagros',
        productId: 'prod-006',
        productName: 'Arroz Costeño Extra 1Kg',
        productSlug: 'arroz-costeno-extra-1kg',
        description: 'Arroz añejo seleccionado grano largo.',
        brandName: 'Costeño',
        measurementType: 'UNIT',
        pricingMode: 'FIXED',
        priceUnit: 'UNIT',
        hasVariants: false,
        primaryImageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80',
        primaryPrice: 4.60,
        primaryPriceUnit: 'UNIT',
        allowsDirectQuickAdd: true,
        isAvailable: true
      },
      {
        storeProductId: 'sp-007',
        storeId,
        storeName: 'Bodega Milagros',
        productId: 'prod-007',
        productName: 'Aceite Primor Clásico 900ml',
        productSlug: 'aceite-primor-clasico-900ml',
        description: 'Aceite vegetal comestible 100% puro.',
        brandName: 'Primor',
        measurementType: 'UNIT',
        pricingMode: 'FIXED',
        priceUnit: 'UNIT',
        hasVariants: false,
        primaryImageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80',
        primaryPrice: 8.50,
        primaryPriceUnit: 'UNIT',
        allowsDirectQuickAdd: true,
        isAvailable: true
      }
    ];

    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      return demoProducts.filter(
        p => p.productName.toLowerCase().includes(q) || p.brandName?.toLowerCase().includes(q)
      );
    }

    return demoProducts;
  }
}
