import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FoodCartService } from '../../../../core/services/food-cart/food-cart.service';
import { FoodCart, FoodCartItem, SelectedModifier, SelectedRequired } from '../../../../core/models/food-cart.model';

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

  serviceOptions = [
    { id: 'food', name: 'Comida', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png', route: '/food/catalog', available: true },
    { id: 'liquor', name: 'Licores', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779227373/delivery-categories/licuour.png', route: '', available: false },
    { id: 'market', name: 'Mercado', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237655/delivery-categories/market.png', route: '', available: false },
    { id: 'courier', name: 'Couriers', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237691/delivery-categories/courier.png', route: '', available: false },
    { id: 'pharmacy', name: 'Farmacia', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237706/delivery-categories/farmacy.png', route: '', available: false }
  ];

  selectService(service: any) {
    if (service.available && service.route) {
      this.router.navigate([service.route]);
    }
  }

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

  expandedItemIds = signal<Set<string>>(new Set());

  toggleExpand(itemId: string) {
    this.expandedItemIds.update(set => {
      const next = new Set(set);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItemIds().has(itemId);
  }

  toggleCutlery(item: FoodCartItem) {
    this.isUpdating.set(true);
    const newInclude = !item.includeCutlery;
    this.foodCartService.updateItem(item.id, {
      quantity: item.quantity,
      includeCutlery: newInclude,
      modifiers: item.modifiers,
      requiredSelections: item.requiredSelections,
      specialInstructions: item.specialInstructions
    }).subscribe({
      next: (updatedCart) => {
        console.log('✅ Preferencia de cubiertos actualizada');
        this.cart.set(updatedCart);
        this.isUpdating.set(false);
      },
      error: (err) => {
        console.error('❌ Error actualizando cubiertos:', err);
        alert('No se pudo actualizar la preferencia de cubiertos');
        this.isUpdating.set(false);
      }
    });
  }

  increaseQuantity(item: FoodCartItem) {
    this.updateItemQuantity(item, item.quantity + 1);
  }

  decreaseQuantity(item: FoodCartItem) {
    if (item.quantity > 1) {
      this.updateItemQuantity(item, item.quantity - 1);
    }
  }

  updateItemQuantity(item: FoodCartItem, newQuantity: number) {
    this.isUpdating.set(true);
    this.foodCartService.updateItem(item.id, {
      quantity: newQuantity,
      includeCutlery: item.includeCutlery,
      modifiers: item.modifiers,
      requiredSelections: item.requiredSelections,
      specialInstructions: item.specialInstructions
    }).subscribe({
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

  getGroupedModifiers(modifiers: SelectedModifier[]): { groupName: string, items: SelectedModifier[] }[] {
    if (!modifiers || modifiers.length === 0) return [];
    const map = new Map<string, SelectedModifier[]>();
    for (const mod of modifiers) {
      const gName = mod.modifierGroupName || 'Extras';
      if (!map.has(gName)) map.set(gName, []);
      map.get(gName)!.push(mod);
    }
    return Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }));
  }

  getGroupedRequired(required: SelectedRequired[]): { groupName: string, items: SelectedRequired[] }[] {
    if (!required || required.length === 0) return [];
    const map = new Map<string, SelectedRequired[]>();
    for (const req of required) {
      const gName = req.requiredGroupName || 'Opciones Requeridas';
      if (!map.has(gName)) map.set(gName, []);
      map.get(gName)!.push(req);
    }
    return Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }));
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

    // Limpiamos cualquier rastro de pedido previo antes de iniciar checkout
    localStorage.removeItem('yata_confirmed_order');
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
