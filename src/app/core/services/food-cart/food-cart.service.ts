import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FoodCart, FoodCartItem, AddToCartRequest } from '../../models/food-cart.model';

@Injectable({
  providedIn: 'root'
})
export class FoodCartService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/food-cart`;

  // Estado del carrito en signals
  private cartSignal = signal<FoodCart | null>(null);

  // Computed signals
  cart = computed(() => this.cartSignal());
  items = computed(() => this.cartSignal()?.items || []);
  itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );
  subtotal = computed(() => this.cartSignal()?.subtotal || 0);
  total = computed(() => this.cartSignal()?.total || 0);
  restaurantId = computed(() => this.cartSignal()?.restaurantId);
  restaurantName = computed(() => this.cartSignal()?.restaurantName);

  /**
   * Obtener carrito actual
   */
  getCart(): Observable<FoodCart> {
    return this.http.get<FoodCart>(this.apiUrl).pipe(
      tap(cart => this.cartSignal.set(cart))
    );
  }

  /**
   * Agregar item al carrito
   */
  addItem(request: AddToCartRequest): Observable<FoodCart> {
    return this.http.post<FoodCart>(`${this.apiUrl}/items`, request).pipe(
      tap(cart => {
        this.cartSignal.set(cart);
        console.log('✅ Platillo agregado al carrito');
      })
    );
  }

  /**
   * Actualizar cantidad de un item
   */
  updateItem(itemId: string, quantity: number): Observable<FoodCart> {
    return this.http.put<FoodCart>(`${this.apiUrl}/items/${itemId}`, { quantity }).pipe(
      tap(cart => this.cartSignal.set(cart))
    );
  }

  /**
   * Eliminar item del carrito
   */
  removeItem(itemId: string): Observable<FoodCart> {
    return this.http.delete<FoodCart>(`${this.apiUrl}/items/${itemId}`).pipe(
      tap(cart => this.cartSignal.set(cart))
    );
  }

  /**
   * Vaciar carrito completo
   */
  clearCart(): Observable<void> {
    return this.http.delete<void>(this.apiUrl).pipe(
      tap(() => {
        this.cartSignal.set(null);
        console.log('🗑️ Carrito vaciado');
      })
    );
  }

  /**
   * Validar si se puede agregar de otro restaurante
   */
  validateRestaurant(restaurantId: string): Observable<{ canAdd: boolean; message?: string }> {
    return this.http.post<{ canAdd: boolean; message?: string }>(
      `${this.apiUrl}/validate-restaurant`,
      { restaurantId }
    );
  }

  // ❌ REMOVIDO: calculateFees() - Esto ahora va en FoodOrderService
}
