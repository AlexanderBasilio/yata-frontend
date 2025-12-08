import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FoodCartService } from '../../../../core/services/food-cart/food-cart.service';

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

  // Datos del carrito desde el servicio
  cart = this.foodCartService.cart;
  items = this.foodCartService.items;
  itemCount = this.foodCartService.itemCount;
  subtotal = this.foodCartService.subtotal;
  restaurantName = this.foodCartService.restaurantName;

  isLoading = computed(() => !this.cart());

  ngOnInit() {
    this.loadCart();
  }

  loadCart() {
    this.foodCartService.getCart().subscribe({
      error: (error) => {
        console.error('Error cargando carrito:', error);
      }
    });
  }

  increaseQuantity(itemId: string) {
    const item = this.items().find(i => i.id === itemId);
    if (!item) return;

    this.foodCartService.updateItem(itemId, item.quantity + 1).subscribe({
      error: (error) => {
        console.error('Error actualizando cantidad:', error);
        alert('No se pudo actualizar la cantidad');
      }
    });
  }

  decreaseQuantity(itemId: string) {
    const item = this.items().find(i => i.id === itemId);
    if (!item) return;

    if (item.quantity === 1) {
      this.removeItem(itemId);
      return;
    }

    this.foodCartService.updateItem(itemId, item.quantity - 1).subscribe({
      error: (error) => {
        console.error('Error actualizando cantidad:', error);
        alert('No se pudo actualizar la cantidad');
      }
    });
  }

  removeItem(itemId: string) {
    if (!confirm('¿Eliminar este platillo del carrito?')) return;

    this.foodCartService.removeItem(itemId).subscribe({
      error: (error) => {
        console.error('Error eliminando item:', error);
        alert('No se pudo eliminar el platillo');
      }
    });
  }

  clearCart() {
    if (!confirm('¿Vaciar todo el carrito?')) return;

    this.foodCartService.clearCart().subscribe({
      next: () => {
        this.router.navigate(['/food/catalog']);
      },
      error: (error) => {
        console.error('Error vaciando carrito:', error);
        alert('No se pudo vaciar el carrito');
      }
    });
  }

  goToCheckout() {
    // TODO: Implementar checkout de comida
    alert('Checkout de comida - Por implementar');
  }

  goBack() {
    this.router.navigate(['/food/catalog']);
  }
}
