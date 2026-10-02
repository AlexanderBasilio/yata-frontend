import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpContext } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddMarketCartItemRequest,
  MarketCartItemDto,
  MarketCartResponse,
  MarketProximityConflictError,
  UpdateMarketCartItemRequest
} from '../../models/market.model';
import { AuthService } from '../auth/auth.service';
import { HANDLE_ERRORS_LOCALLY } from '../../interceptors/error.interceptor';

@Injectable({
  providedIn: 'root'
})
export class MarketCartService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/api/market/customer/cart`;
  private readonly LOCAL_CART_KEY = 'yata_market_cart';

  // Signals
  public cart = signal<MarketCartResponse | null>(null);
  public totalItems = signal<number>(0);
  public isAdding = signal<boolean>(false);

  // Proximity conflict state
  public conflictData = signal<{
    request: AddMarketCartItemRequest;
    currentStoreName?: string;
    newStoreName?: string;
    errorMessage?: string;
  } | null>(null);
  public showConflictModal = signal<boolean>(false);

  constructor() {
    this.restoreLocalCart();
    // NOTA CRÍTICA: NUNCA ejecutar getCart().subscribe() en el constructor.
    // Solo se debe consultar cuando el usuario esté autenticado o ingrese al flujo de compra.
  }

  // 1. Obtener carrito activo (solo consulta HTTP si el usuario está autenticado)
  getCart(): Observable<MarketCartResponse | null> {
    if (!this.authService.isLoggedIn()) {
      const cached = this.getLocalCart();
      this.cart.set(cached);
      this.totalItems.set(cached?.totalItemsCount ?? 0);
      return of(cached);
    }

    return this.http
      .get<MarketCartResponse>(this.baseUrl, {
        context: new HttpContext().set(HANDLE_ERRORS_LOCALLY, true)
      })
      .pipe(
        tap(cart => {
          this.cart.set(cart);
          this.totalItems.set(cart?.totalItemsCount ?? 0);
          this.saveLocalCart(cart);
        }),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404 || error.status === 0 || error.status === 401 || error.status === 403) {
            const cached = this.getLocalCart();
            if (cached) {
              this.cart.set(cached);
              this.totalItems.set(cached.totalItemsCount);
              return of(cached);
            }
            return of(null);
          }
          console.warn('⚠️ Error al consultar carrito de mercado:', error);
          return of(this.getLocalCart());
        })
      );
  }

  // 2. Agregar ítem al carrito
  addItem(
    request: AddMarketCartItemRequest,
    storeName?: string,
    productName?: string,
    unitPrice?: number,
    imageUrl?: string
  ): Observable<MarketCartResponse> {
    this.isAdding.set(true);

    if (!this.authService.isLoggedIn()) {
      // Si no ha iniciado sesión, guardamos en el carrito local temporal
      this.isAdding.set(false);
      const fallbackCart = this.emulateAddToCart(request, storeName, productName, unitPrice, imageUrl);
      this.cart.set(fallbackCart);
      this.totalItems.set(fallbackCart.totalItemsCount);
      this.saveLocalCart(fallbackCart);
      return of(fallbackCart);
    }

    return this.http
      .post<MarketCartResponse>(`${this.baseUrl}/items`, request, {
        context: new HttpContext().set(HANDLE_ERRORS_LOCALLY, true)
      })
      .pipe(
        tap(updatedCart => {
          this.cart.set(updatedCart);
          this.totalItems.set(updatedCart.totalItemsCount);
          this.saveLocalCart(updatedCart);
          this.isAdding.set(false);
        }),
        catchError((error: HttpErrorResponse) => {
          this.isAdding.set(false);

          // 🚨 DETECTAR STORE_OUT_OF_PROXIMITY_RANGE (código de error 400 multitienda > 100m)
          const errorBody = error.error as MarketProximityConflictError;
          if (error.status === 400 && errorBody?.errorCode === 'STORE_OUT_OF_PROXIMITY_RANGE') {
            const currentAnchorName = this.cart()?.stores?.[0]?.storeName || 'tu tienda anterior';
            this.conflictData.set({
              request,
              currentStoreName: currentAnchorName,
              newStoreName: storeName || 'este puesto',
              errorMessage: errorBody.message || `No es posible combinar pedidos a más de 100 metros de distancia.`
            });
            this.showConflictModal.set(true);
            return throwError(() => error);
          }

          // Fallback local ante errores de conexión
          console.warn('⚠️ Endpoint de carrito falló, actualizando estado localmente:', error);
          const fallbackCart = this.emulateAddToCart(request, storeName, productName, unitPrice, imageUrl);
          this.cart.set(fallbackCart);
          this.totalItems.set(fallbackCart.totalItemsCount);
          this.saveLocalCart(fallbackCart);
          return of(fallbackCart);
        })
      );
  }

  // 3. Modificar cantidad
  updateItemQuantity(cartItemId: string, quantity: number): Observable<MarketCartResponse> {
    const payload: UpdateMarketCartItemRequest = { quantity };

    if (!this.authService.isLoggedIn()) {
      const cart = this.emulateUpdateQuantity(cartItemId, quantity);
      this.cart.set(cart);
      this.totalItems.set(cart?.totalItemsCount ?? 0);
      this.saveLocalCart(cart);
      return of(cart!);
    }

    return this.http
      .patch<MarketCartResponse>(`${this.baseUrl}/items/${cartItemId}`, payload, {
        context: new HttpContext().set(HANDLE_ERRORS_LOCALLY, true)
      })
      .pipe(
        tap(cart => {
          this.cart.set(cart);
          this.totalItems.set(cart.totalItemsCount);
          this.saveLocalCart(cart);
        }),
        catchError(err => {
          console.warn('⚠️ Error en updateItemQuantity, ajustando localmente:', err);
          const cart = this.emulateUpdateQuantity(cartItemId, quantity);
          this.cart.set(cart);
          this.totalItems.set(cart?.totalItemsCount ?? 0);
          this.saveLocalCart(cart);
          return of(cart!);
        })
      );
  }

  // 4. Eliminar ítem
  removeItem(cartItemId: string): Observable<MarketCartResponse> {
    if (!this.authService.isLoggedIn()) {
      const cart = this.emulateRemoveItem(cartItemId);
      this.cart.set(cart);
      this.totalItems.set(cart?.totalItemsCount ?? 0);
      this.saveLocalCart(cart);
      return of(cart!);
    }

    return this.http
      .delete<MarketCartResponse>(`${this.baseUrl}/items/${cartItemId}`, {
        context: new HttpContext().set(HANDLE_ERRORS_LOCALLY, true)
      })
      .pipe(
        tap(cart => {
          this.cart.set(cart);
          this.totalItems.set(cart.totalItemsCount);
          this.saveLocalCart(cart);
        }),
        catchError(err => {
          console.warn('⚠️ Error en removeItem, ajustando localmente:', err);
          const cart = this.emulateRemoveItem(cartItemId);
          this.cart.set(cart);
          this.totalItems.set(cart?.totalItemsCount ?? 0);
          this.saveLocalCart(cart);
          return of(cart!);
        })
      );
  }

  // 5. Vaciar carrito completo
  clearCart(): Observable<void> {
    this.cart.set(null);
    this.totalItems.set(0);
    localStorage.removeItem(this.LOCAL_CART_KEY);

    if (!this.authService.isLoggedIn()) {
      return of(void 0);
    }

    return this.http
      .delete<void>(this.baseUrl, {
        context: new HttpContext().set(HANDLE_ERRORS_LOCALLY, true)
      })
      .pipe(
        catchError(err => {
          console.warn('⚠️ Error limpiando carrito en servidor, limpiado localmente:', err);
          return of(void 0);
        })
      );
  }

  // Resolver conflicto: Vaciar y comprar aquí
  resolveConflictClearAndAdd(): Observable<MarketCartResponse> {
    const conflict = this.conflictData();
    if (!conflict) return of(this.cart()!);

    this.showConflictModal.set(false);
    this.conflictData.set(null);

    return this.clearCart().pipe(
      map(() => null),
      catchError(() => of(null)),
      // Reintentar el POST tras vaciar
      tap(() => {
        this.addItem(conflict.request, conflict.newStoreName).subscribe();
      }),
      map(() => this.cart()!)
    );
  }

  dismissConflict(): void {
    this.showConflictModal.set(false);
    this.conflictData.set(null);
  }

  // --- LOCAL FALLBACK EMULATION ---
  private restoreLocalCart(): void {
    const cached = this.getLocalCart();
    if (cached) {
      this.cart.set(cached);
      this.totalItems.set(cached.totalItemsCount);
    }
  }

  private getLocalCart(): MarketCartResponse | null {
    try {
      const data = localStorage.getItem(this.LOCAL_CART_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveLocalCart(cart: MarketCartResponse | null): void {
    try {
      if (cart) {
        localStorage.setItem(this.LOCAL_CART_KEY, JSON.stringify(cart));
      } else {
        localStorage.removeItem(this.LOCAL_CART_KEY);
      }
    } catch (e) {
      console.warn('Could not save market cart to local storage', e);
    }
  }

  private emulateAddToCart(
    req: AddMarketCartItemRequest,
    storeName?: string,
    productName?: string,
    unitPrice?: number,
    imageUrl?: string
  ): MarketCartResponse {
    let current = this.getLocalCart();
    const effectivePrice = (unitPrice ?? 5.0) + (req.optionsAdditionalPrice ?? 0);
    const itemSubtotal = effectivePrice * req.quantity;

    const newItem: MarketCartItemDto = {
      itemId: 'mci-' + Date.now(),
      storeId: req.storeId,
      storeName: storeName || 'Bodega Milagros',
      variantId: req.variantId,
      productId: req.productId,
      productName: productName || 'Producto de Mercado',
      primaryImageUrl: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80',
      measurementType: req.selectedMeasurement || 'UNIT',
      selectedMeasurement: req.selectedMeasurement || 'UNIT',
      quantity: req.quantity,
      unitPrice: unitPrice ?? 5.0,
      optionsAdditionalPrice: req.optionsAdditionalPrice ?? 0,
      effectiveUnitPrice: effectivePrice,
      selectedOptionsJson: req.selectedOptionsJson,
      itemNotes: req.itemNotes,
      subtotal: itemSubtotal
    };

    if (!current || !current.stores) {
      current = {
        cartId: 'mc-' + Date.now(),
        anchorStoreId: req.storeId,
        totalItemsCount: req.quantity,
        distinctStoresCount: 1,
        totalWeightGrams: 1000 * req.quantity,
        totalVolumeCm3: 500 * req.quantity,
        productsSubtotal: itemSubtotal,
        estimatedConsolidationFee: 0,
        estimatedTotal: itemSubtotal,
        stores: [
          {
            storeId: req.storeId,
            storeName: storeName || 'Bodega Milagros',
            storeSubtotal: itemSubtotal,
            itemsCount: req.quantity,
            items: [newItem]
          }
        ]
      };
    } else {
      let storeGroup = current.stores.find(s => s.storeId === req.storeId);
      if (!storeGroup) {
        storeGroup = {
          storeId: req.storeId,
          storeName: storeName || 'Puesto de Mercado',
          storeSubtotal: 0,
          itemsCount: 0,
          items: []
        };
        current.stores.push(storeGroup);
      }

      storeGroup.items.push(newItem);
      this.recalculateCart(current);
    }

    return current;
  }

  private emulateUpdateQuantity(cartItemId: string, qty: number): MarketCartResponse | null {
    const current = this.getLocalCart();
    if (!current) return null;

    current.stores.forEach(store => {
      const item = store.items.find(i => i.itemId === cartItemId);
      if (item) {
        item.quantity = qty;
        item.subtotal = item.effectiveUnitPrice * qty;
      }
    });

    this.recalculateCart(current);
    return current;
  }

  private emulateRemoveItem(cartItemId: string): MarketCartResponse | null {
    const current = this.getLocalCart();
    if (!current) return null;

    current.stores.forEach(store => {
      store.items = store.items.filter(i => i.itemId !== cartItemId);
    });

    current.stores = current.stores.filter(s => s.items.length > 0);
    this.recalculateCart(current);
    return current;
  }

  private recalculateCart(cart: MarketCartResponse): void {
    let grandSubtotal = 0;
    let totalItems = 0;

    cart.stores.forEach(store => {
      let storeSub = 0;
      let storeCount = 0;
      store.items.forEach(i => {
        storeSub += i.subtotal;
        storeCount += i.quantity;
      });
      store.storeSubtotal = storeSub;
      store.itemsCount = storeCount;
      grandSubtotal += storeSub;
      totalItems += storeCount;
    });

    cart.distinctStoresCount = cart.stores.length;
    cart.productsSubtotal = grandSubtotal;
    cart.estimatedConsolidationFee = cart.distinctStoresCount > 1 ? (cart.distinctStoresCount - 1) * 0.5 : 0;
    cart.estimatedTotal = grandSubtotal + cart.estimatedConsolidationFee;
    cart.totalItemsCount = totalItems;
  }
}
