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

  // 1. Ver ruleta/columna de secciones disponibles (filtradas dinámicamente por las zonas del cliente)
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
      map(sections => sections || []),
      catchError(err => {
        console.warn('⚠️ Error al listar secciones de mercado:', err);
        return of([]);
      })
    );
  }

  // 2. Ver ruleta de comercios de mercado (con filtros por zonas, sección seleccionada y búsqueda por nombre)
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
    if (search && search.trim().length > 0) params = params.set('search', search.trim());

    return this.http.get<MarketStoreSummaryDto[]>(`${this.baseUrl}/stores`, { params }).pipe(
      map(stores => stores || []),
      catchError(err => {
        console.warn('⚠️ Error al listar comercios de mercado:', err);
        return of([]);
      })
    );
  }

  // 3. Obtener cabecera completa del comercio (logo, portada, rating, distrito, ciudad, isOpen, secciones)
  getStoreDetail(storeId: string, lat?: number, lng?: number): Observable<MarketStoreSummaryDto | null> {
    let params = new HttpParams();
    if (lat !== undefined && lat !== null) params = params.set('lat', lat.toString());
    if (lng !== undefined && lng !== null) params = params.set('lng', lng.toString());

    return this.http.get<MarketStoreSummaryDto>(`${this.baseUrl}/stores/${storeId}`, { params }).pipe(
      catchError(err => {
        console.warn(`⚠️ Error al obtener detalle de tienda ${storeId}:`, err);
        return of(null);
      })
    );
  }

  // 4. Ver secciones que vende este comercio (para selector lateral de secciones en la tienda)
  listStoreSections(storeId: string): Observable<MarketSectionCustomerDto[]> {
    return this.http.get<MarketSectionCustomerDto[]>(`${this.baseUrl}/stores/${storeId}/sections`).pipe(
      map(sections => sections || []),
      catchError(err => {
        console.warn(`⚠️ Error al listar secciones de tienda ${storeId}:`, err);
        return of([]);
      })
    );
  }

  // 5. Ver categorías de una sección en este comercio (para selector de categorías en la tienda)
  listStoreCategories(storeId: string, sectionId: string): Observable<MarketCategoryCustomerDto[]> {
    return this.http
      .get<MarketCategoryCustomerDto[]>(
        `${this.baseUrl}/stores/${storeId}/sections/${sectionId}/categories`
      )
      .pipe(
        map(categories => categories || []),
        catchError(err => {
          console.warn(`⚠️ Error al listar categorías de tienda ${storeId}, sección ${sectionId}:`, err);
          return of([]);
        })
      );
  }

  // 6. Ver catálogo de productos de una tienda (filtrado opcional por sección, categoría o búsqueda)
  listProductsByStore(
    storeId: string,
    sectionId?: string,
    categoryId?: string,
    search?: string
  ): Observable<MarketStoreProductCustomerDto[]> {
    let params = new HttpParams();
    if (sectionId) params = params.set('sectionId', sectionId);
    if (categoryId) params = params.set('categoryId', categoryId);
    if (search && search.trim().length > 0) params = params.set('search', search.trim());

    return this.http
      .get<MarketStoreProductCustomerDto[]>(`${this.baseUrl}/stores/${storeId}/products`, { params })
      .pipe(
        map(products => products || []),
        catchError(err => {
          console.warn(`⚠️ Error al listar productos de tienda ${storeId}:`, err);
          return of([]);
        })
      );
  }

  // 6.1. Ver detalle individual de un producto en un comercio (para modal de personalización o enlace directo)
  getProductDetail(storeId: string, productId: string): Observable<MarketStoreProductCustomerDto | null> {
    return this.http
      .get<MarketStoreProductCustomerDto>(`${this.baseUrl}/stores/${storeId}/products/${productId}`)
      .pipe(
        catchError(err => {
          console.warn(`⚠️ Error al obtener detalle de producto ${productId} en tienda ${storeId}:`, err);
          return of(null);
        })
      );
  }

  // 7. Productos más demandados de mercado en la zona del cliente
  getTrendingProducts(zoneIds?: string[]): Observable<MarketStoreProductCustomerDto[]> {
    let params = new HttpParams();
    if (zoneIds && zoneIds.length > 0) {
      zoneIds.forEach(z => (params = params.append('zones', z)));
    }
    return this.http
      .get<MarketStoreProductCustomerDto[]>(`${this.baseUrl}/home/trending-products`, { params })
      .pipe(
        map(res => res || []),
        catchError(() => of([]))
      );
  }

  // 8. Comercios de mercado en la zona exacta del cliente
  getNearbyStores(zoneId?: string): Observable<MarketStoreSummaryDto[]> {
    let params = new HttpParams();
    if (zoneId) params = params.set('zoneId', zoneId);
    return this.http.get<MarketStoreSummaryDto[]>(`${this.baseUrl}/home/nearby-stores`, { params }).pipe(
      map(res => res || []),
      catchError(() => of([]))
    );
  }
}
