import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { FoodCart, AddToCartRequest } from '../../models/food-cart.model';

@Injectable({
  providedIn: 'root'
})
export class FoodCartService {
  private http = inject(HttpClient);
  private foodCartApiUrl = `${environment.foodCartServiceUrl}/api/food-cart`;
  private readonly CART_ID_KEY = 'yata_cart_id';

  // ✅ Obtener o crear Cart ID
  private getCartId(): string | null {
    return localStorage.getItem(this.CART_ID_KEY);
  }

  // ✅ Guardar Cart ID
  private setCartId(cartId: string): void {
    localStorage.setItem(this.CART_ID_KEY, cartId);
  }

  // ✅ Crear headers con X-CART-ID
  private getHeaders(): HttpHeaders {
    const cartId = this.getCartId();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (cartId) {
      headers = headers.set('X-CART-ID', cartId);
    }

    return headers;
  }

  // Obtener carrito actual
  getCart(): Observable<FoodCart | null> {
    return this.http.get<FoodCart>(this.foodCartApiUrl, { headers: this.getHeaders() }).pipe(
      tap((cart) => {
        // Guardar el cart ID si lo recibimos
        if (cart?.id) {
          this.setCartId(cart.id);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 0) {
          console.log('📭 Carrito vacío o no existe');
          return of(null);
        }
        console.error('❌ Error obteniendo carrito:', error);
        return of(null);
      })
    );
  }

  // Agregar item al carrito
  addItem(request: AddToCartRequest): Observable<FoodCart> {
    return this.http.post<FoodCart>(`${this.foodCartApiUrl}/items`, request, {
      headers: this.getHeaders()
    }).pipe(
      tap((cart) => {
        // Guardar el cart ID después de agregar
        if (cart?.id) {
          this.setCartId(cart.id);
          console.log('🛒 Cart ID guardado:', cart.id);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error agregando item:', error);
        return throwError(() => error);
      })
    );
  }

  // Actualizar cantidad de un item
  updateItemQuantity(itemId: string, quantity: number): Observable<FoodCart> {
    return this.http.put<FoodCart>(`${this.foodCartApiUrl}/items/${itemId}`,
      { quantity },
      { headers: this.getHeaders() }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error actualizando cantidad:', error);
        return throwError(() => error);
      })
    );
  }

  // Eliminar un item del carrito
  removeItem(itemId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.foodCartApiUrl}/items/${itemId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error eliminando item:', error);
        return throwError(() => error);
      })
    );
  }

  // Vaciar el carrito
  clearCart(): Observable<void> {
    return this.http.delete<void>(this.foodCartApiUrl, { headers: this.getHeaders() }).pipe(
      tap(() => {
        // Opcional: podrías limpiar el cartId aquí si quieres
        // localStorage.removeItem(this.CART_ID_KEY);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error vaciando carrito:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ CORREGIDO: Validar restaurante (POST según tu backend)

  // En food-cart.service.ts
  validateRestaurant(restaurantId: string): Observable<boolean> {
    // El body debe ser un objeto JSON con la clave 'restaurantId'
    const body = { restaurantId: restaurantId };

    return this.http.post<boolean>(
      `${this.foodCartApiUrl}/validate-restaurant`,
      body, // <-- Enviamos el objeto
      { headers: this.getHeaders() }
    ).pipe(
      map((canAdd) => canAdd),
      catchError((error: HttpErrorResponse) => {
        // Si el backend responde con 409 (Conflicto, carrito de otro restaurante),
        // el componente padre lo manejará con `if (!canAdd) { ... }`.
        // En este caso, el servidor retornará 409, no un booleano, así que lanzamos el error
        // para que sea capturado en el try/catch del componente padre.

        // Corregimos el catchError para que relance el error
        return throwError(() => error);
      })
    );
  }

  // ✅ NUEVO: Limpiar cart ID (útil para logout o testing)
  clearCartId(): void {
    localStorage.removeItem(this.CART_ID_KEY);
  }
}
