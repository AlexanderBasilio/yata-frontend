import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FoodCartService } from '../../../../core/services/food-cart/food-cart.service';
import { FoodCart, FoodCartItem } from '../../../../core/models/food-cart.model';

@Component({
  selector: 'app-food-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './food-cart.component.html',
  styleUrl: './food-cart.component.scss'
})
export class FoodCartComponent implements OnInit {
  private foodCartService = inject(FoodCartService);
  private router = inject(Router);

  cart = signal<FoodCart | null>(null);
  isLoading = signal(true);
  isUpdating = signal(false);
  isClearing = signal(false);

  // Computed para saber si el carrito está vacío
  isEmpty = computed(() => !this.cart() || this.cart()!.items.length === 0);

  // ✅ ACTUALIZADO: Solo subtotal (sin deliveryFee ni serviceFee)
  subtotal = computed(() => this.cart()?.subtotal || 0);
  total = computed(() => this.subtotal()); // El total es solo el subtotal

  ngOnInit() {
    this.loadCart();
  }

  loadCart() {
    this.isLoading.set(true);
    this.foodCartService.getCart().subscribe({
      next: (cart) => {
        console.log('🛒 Carrito cargado:', cart);
        // Puede ser null si no hay carrito
        this.cart.set(cart);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando carrito:', error);
        // En caso de error, mostrar carrito vacío
        this.cart.set(null);
        this.isLoading.set(false);
      }
    });
  }

  increaseQuantity(item: FoodCartItem) {
    this.updateItemQuantity(item.id, item.quantity + 1);
  }

  decreaseQuantity(item: FoodCartItem) {
    if (item.quantity > 1) {
      this.updateItemQuantity(item.id, item.quantity - 1);
    }
  }

  updateItemQuantity(itemId: string, newQuantity: number) {
    this.isUpdating.set(true);
    this.foodCartService.updateItemQuantity(itemId, newQuantity).subscribe({
      next: (updatedCart) => {
        console.log('✅ Cantidad actualizada');
        this.cart.set(updatedCart);
        this.isUpdating.set(false);
      },
      error: (error) => {
        console.error('❌ Error actualizando cantidad:', error);
        alert('No se pudo actualizar la cantidad');
        this.isUpdating.set(false);
      }
    });
  }

  removeItem(itemId: string) {
    const confirmRemove = confirm('¿Deseas eliminar este platillo del carrito?');
    if (!confirmRemove) return;

    this.isUpdating.set(true);
    this.foodCartService.removeItem(itemId).subscribe({
      next: (response) => {
        console.log('✅ Item eliminado:', response.message);
        // Recargar el carrito después de eliminar
        this.loadCart();
        this.isUpdating.set(false);
      },
      error: (error) => {
        console.error('❌ Error eliminando item:', error);
        alert('No se pudo eliminar el platillo');
        this.isUpdating.set(false);
      }
    });
  }

  clearCart() {
    const confirmClear = confirm('¿Deseas vaciar todo el carrito?');
    if (!confirmClear) return;

    this.isClearing.set(true);
    this.foodCartService.clearCart().subscribe({
      next: () => {
        console.log('✅ Carrito vaciado');
        this.cart.set(null);
        this.isClearing.set(false);
      },
      error: (error) => {
        console.error('❌ Error vaciando carrito:', error);
        alert('No se pudo vaciar el carrito');
        this.isClearing.set(false);
      }
    });
  }

  goToRestaurant() {
    const restaurantId = this.cart()?.restaurantId;
    if (restaurantId) {
      this.router.navigate(['/food/restaurant', restaurantId]);
    }
  }

  goToCatalog() {
    this.router.navigate(['/food/catalog']);
  }

  proceedToCheckout() {
    if (this.isEmpty()) {
      alert('Tu carrito está vacío');
      return;
    }

    // TODO: Navegar a la página de checkout/orden
    this.router.navigate(['/food/checkout']);
  }

  // Helper para mostrar los modificadores de un item
  getModifiersText(item: FoodCartItem): string {
    const parts: string[] = [];

    // ✅ Modificadores (extras que cuestan dinero)
    if (item.modifiers && item.modifiers.length > 0) {
      const modifiersText = item.modifiers
        .map(m => {
          const qty = m.quantity > 1 ? ` (x${m.quantity})` : '';
          return `${m.modifierName}${qty}`;
        })
        .join(', ');

      if (modifiersText) {
        parts.push(modifiersText);
      }
    }

    // ✅ Selecciones requeridas (incluidas en el precio)
    if (item.requiredSelections && item.requiredSelections.length > 0) {
      const requiredText = item.requiredSelections
        .map(r => r.optionName)
        .join(', ');

      if (requiredText) {
        parts.push(requiredText);
      }
    }

    return parts.length > 0 ? parts.join(' • ') : '';
  }

  // ✅ NUEVO: Helper para verificar si hay modificadores/selecciones
  hasCustomizations(item: FoodCartItem): boolean {
    return (item.modifiers && item.modifiers.length > 0) ||
      (item.requiredSelections && item.requiredSelections.length > 0);
  }
}
