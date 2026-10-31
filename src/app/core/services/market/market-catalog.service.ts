import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
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
  private router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/api/market/customer/catalog`;

  /**
   * Detecta la vertical activa a partir de la URL actual ('LIQUOR', 'PETS' o 'MARKET').
   */
  getActiveVertical(): 'MARKET' | 'LIQUOR' | 'PETS' {
    const url = this.router.url.toLowerCase();
    if (url.includes('/liquor')) return 'LIQUOR';
    if (url.includes('/pets')) return 'PETS';
    return 'MARKET';
  }

  // 1. Ver secciones disponibles (filtradas dinámicamente por vertical y zonas del cliente)
  listActiveSections(
    zoneIds?: string[],
    lat?: number,
    lng?: number,
    vertical?: string
  ): Observable<MarketSectionCustomerDto[]> {
    const v = vertical || this.getActiveVertical();
    let params = new HttpParams().set('vertical', v);

    if (zoneIds && zoneIds.length > 0) {
      zoneIds.forEach(z => (params = params.append('zones', z)));
    }
    if (lat !== undefined && lat !== null) params = params.set('lat', lat.toString());
    if (lng !== undefined && lng !== null) params = params.set('lng', lng.toString());

    return this.http.get<MarketSectionCustomerDto[]>(`${this.baseUrl}/sections`, { params }).pipe(
      map(sections => sections || []),
      catchError(err => {
        console.warn(`⚠️ Error al listar secciones para vertical ${v}:`, err);
        return of([]);
      })
    );
  }

  // 2. Ver comercios de la vertical activa (con filtros por zonas, sección y búsqueda)
  listStores(
    zoneIds?: string[],
    sectionId?: string,
    lat?: number,
    lng?: number,
    search?: string,
    vertical?: string
  ): Observable<MarketStoreSummaryDto[]> {
    const v = vertical || this.getActiveVertical();
    let params = new HttpParams().set('vertical', v);

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
        console.warn(`⚠️ Error al listar comercios para vertical ${v}:`, err);
        return of([]);
      })
    );
  }

  // 3. Obtener cabecera completa del comercio filtrada por vertical
  getStoreDetail(storeId: string, lat?: number, lng?: number, vertical?: string): Observable<MarketStoreSummaryDto | null> {
    const v = vertical || this.getActiveVertical();
    let params = new HttpParams().set('vertical', v);
    if (lat !== undefined && lat !== null) params = params.set('lat', lat.toString());
    if (lng !== undefined && lng !== null) params = params.set('lng', lng.toString());

    return this.http.get<MarketStoreSummaryDto>(`${this.baseUrl}/stores/${storeId}`, { params }).pipe(
      catchError(err => {
        console.warn(`⚠️ Error al obtener detalle de tienda ${storeId} (vertical ${v}):`, err);
        return of(null);
      })
    );
  }

  // 4. Ver secciones que vende este comercio filtradas por vertical
  listStoreSections(storeId: string, vertical?: string): Observable<MarketSectionCustomerDto[]> {
    const v = vertical || this.getActiveVertical();
    const params = new HttpParams().set('vertical', v);

    return this.http.get<MarketSectionCustomerDto[]>(`${this.baseUrl}/stores/${storeId}/sections`, { params }).pipe(
      map(sections => sections || []),
      catchError(err => {
        console.warn(`⚠️ Error al listar secciones de tienda ${storeId} (vertical ${v}):`, err);
        return of([]);
      })
    );
  }

  // 5. Ver categorías de una sección en este comercio filtradas por vertical
  listStoreCategories(storeId: string, sectionId: string, vertical?: string): Observable<MarketCategoryCustomerDto[]> {
    const v = vertical || this.getActiveVertical();
    const params = new HttpParams().set('vertical', v);

    return this.http
      .get<MarketCategoryCustomerDto[]>(
        `${this.baseUrl}/stores/${storeId}/sections/${sectionId}/categories`,
        { params }
      )
      .pipe(
        map(categories => categories || []),
        catchError(err => {
          console.warn(`⚠️ Error al listar categorías de tienda ${storeId}, sección ${sectionId} (vertical ${v}):`, err);
          return of([]);
        })
      );
  }

  // 6. Ver catálogo de productos de una tienda filtrado por vertical
  listProductsByStore(
    storeId: string,
    sectionId?: string,
    categoryId?: string,
    search?: string,
    vertical?: string
  ): Observable<MarketStoreProductCustomerDto[]> {
    const v = vertical || this.getActiveVertical();
    let params = new HttpParams().set('vertical', v);
    if (sectionId) params = params.set('sectionId', sectionId);
    if (categoryId) params = params.set('categoryId', categoryId);
    if (search && search.trim().length > 0) params = params.set('search', search.trim());

    return this.http
      .get<MarketStoreProductCustomerDto[]>(`${this.baseUrl}/stores/${storeId}/products`, { params })
      .pipe(
        map(products => products || []),
        catchError(err => {
          console.warn(`⚠️ Error al listar productos de tienda ${storeId} (vertical ${v}):`, err);
          return of([]);
        })
      );
  }

  // 6.1. Ver detalle individual de un producto
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

  // 7. Productos más demandados en la zona del cliente filtrados por vertical
  getTrendingProducts(zoneIds?: string[], vertical?: string): Observable<MarketStoreProductCustomerDto[]> {
    const v = vertical || this.getActiveVertical();
    let params = new HttpParams().set('vertical', v);
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

  // 8. Comercios en la zona exacta del cliente filtrados por vertical
  getNearbyStores(zoneId?: string, vertical?: string): Observable<MarketStoreSummaryDto[]> {
    const v = vertical || this.getActiveVertical();
    let params = new HttpParams().set('vertical', v);
    if (zoneId) params = params.set('zoneId', zoneId);
    return this.http.get<MarketStoreSummaryDto[]>(`${this.baseUrl}/home/nearby-stores`, { params }).pipe(
      map(res => res || []),
      catchError(() => of([]))
    );
  }
}
