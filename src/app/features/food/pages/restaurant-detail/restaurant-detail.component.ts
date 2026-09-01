import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RestaurantService } from '../../../../core/services/restaurant/restaurant.service';
import { FoodCartService } from '../../../../core/services/food-cart/food-cart.service';
import { Restaurant, Dish } from '../../../../core/models/restaurant.model';
import { AddToCartRequest, FoodCart } from '../../../../core/models/food-cart.model';
import { DishCardComponent } from '../../components/dish-card/dish-card.component';
import { DishModalComponent } from '../../components/dish-modal/dish-modal.component';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, DishCardComponent, DishModalComponent],
  templateUrl: './restaurant-detail.component.html',
  styleUrl: './restaurant-detail.component.scss'
})
export class RestaurantDetailComponent implements OnInit {
  private restaurantService = inject(RestaurantService);
  private foodCartService = inject(FoodCartService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private analytics = inject(AnalyticsService);

  restaurant = signal<Restaurant | null>(null);
  dishes = signal<Dish[]>([]);
  filteredDishes = signal<Dish[]>([]);
  categories = signal<string[]>([]);
  selectedCategory = signal<string | null>(null);

  // Modal Platillo
  showDishModal = signal(false);
  selectedDish = signal<Dish | null>(null);
  isLoadingDishDetail = signal(false);

  // Modal Categorías y Burbuja Guía
  showCategoriesModal = signal(false);
  showCategoryGuideBubble = signal(true);

  openCategoriesModal() {
    this.showCategoryGuideBubble.set(false);
    this.showCategoriesModal.set(true);
  }

  closeCategoriesModal() {
    this.showCategoriesModal.set(false);
  }

  dismissCategoryGuideBubble(event?: Event) {
    if (event) event.stopPropagation();
    this.showCategoryGuideBubble.set(false);
  }

  selectCategoryFromModal(category: string | null) {
    this.showCategoryGuideBubble.set(false);
    if (!category) {
      this.selectedCategory.set(null);
      this.filteredDishes.set(this.dishes());
    } else {
      this.selectedCategory.set(category);
      const filtered = this.dishes().filter(d => d.category === category);
      this.filteredDishes.set(filtered);

      setTimeout(() => {
        const element = document.getElementById(`category-${category}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    this.showCategoriesModal.set(false);
  }

  isLoadingRestaurant = signal(true);
  isLoadingDishes = signal(true);
  isAddingToCart = signal(false);

  // ✅ NUEVO: Estado del carrito para el botón flotante
  cart = signal<FoodCart | null>(null);
  isLoadingCart = signal(false);

  // ✅ NUEVO: Computed para el botón flotante
  cartItemCount = computed(() => {
    const currentCart = this.cart();
    if (!currentCart || !currentCart.items) return 0;

    // Sumar las cantidades de todos los items
    return currentCart.items.reduce((total, item) => total + item.quantity, 0);
  });

  cartTotal = computed(() => this.cart()?.subtotal || 0);

  // Solo mostrar el botón si hay items del mismo restaurante
  shouldShowCartButton = computed(() => {
    const currentCart = this.cart();
    const currentRestaurant = this.restaurant();

    if (!currentCart || !currentRestaurant || currentCart.items.length === 0) {
      return false;
    }

    // Solo mostrar si el carrito es del mismo restaurante
    return currentCart.restaurantId === currentRestaurant.id;
  });

  fullAddress = computed(() => {
    const r = this.restaurant();
    if (!r) return '';
    return `${r.addressLine}, ${r.district}, ${r.city}`;
  });

  ngOnInit() {
    const restaurantId = this.route.snapshot.paramMap.get('id');
    if (!restaurantId) {
      this.router.navigate(['/food/catalog']);
      return;
    }

    this.loadRestaurant(restaurantId);
    this.loadDishes(restaurantId);
    this.loadCart(); // ✅ NUEVO: Cargar el carrito
  }

  // ✅ NUEVO: Cargar el carrito actual
  loadCart() {
    this.isLoadingCart.set(true);
    this.foodCartService.getCart().subscribe({
      next: (cart) => {
        this.cart.set(cart);
        this.isLoadingCart.set(false);
      },
      error: (error) => {
        console.error('Error cargando carrito:', error);
        this.cart.set(null);
        this.isLoadingCart.set(false);
      }
    });
  }

  loadRestaurant(id: string) {
    this.isLoadingRestaurant.set(true);
    this.restaurantService.getRestaurantById(id).subscribe({
      next: (restaurant) => {
        if (!restaurant.isOpen || restaurant.isTemporarilyClosed) {
          alert('Este restaurante se encuentra cerrado en este momento.');
          this.router.navigate(['/food/catalog']);
          return;
        }
        this.restaurant.set(restaurant);
        this.isLoadingRestaurant.set(false);
      },
      error: (error) => {
        console.error('Error cargando restaurante:', error);
        alert('No se pudo cargar el restaurante');
        this.router.navigate(['/food/catalog']);
      }
    });
  }

  loadDishes(restaurantId: string) {
    this.isLoadingDishes.set(true);
    this.restaurantService.getDishesByRestaurant(restaurantId).subscribe({
      next: (dishes) => {
        console.log('✅ Platillos recibidos:', dishes);

        // 1. Ordenar platillos: primero los disponibles (isAvailable !== false), al final no disponibles
        const sortedDishes = [...dishes].sort((a, b) => {
          const aAvail = a.isAvailable !== false ? 1 : 0;
          const bAvail = b.isAvailable !== false ? 1 : 0;
          return bAvail - aAvail;
        });

        this.dishes.set(sortedDishes);
        this.filteredDishes.set(sortedDishes);

        // 2. Ordenar categorías: primero las que tengan mayor cantidad de platos disponibles
        const uniqueCategories = [...new Set(sortedDishes.map(d => d.category))];
        uniqueCategories.sort((catA, catB) => {
          const availA = sortedDishes.filter(d => d.category === catA && d.isAvailable !== false).length;
          const availB = sortedDishes.filter(d => d.category === catB && d.isAvailable !== false).length;
          if (availB !== availA) {
            return availB - availA;
          }
          const totalA = sortedDishes.filter(d => d.category === catA).length;
          const totalB = sortedDishes.filter(d => d.category === catB).length;
          return totalB - totalA;
        });

        this.categories.set(uniqueCategories);
        this.isLoadingDishes.set(false);

        // Auto-abrir el modal del platillo si se pasa dishId en queryParams
        const targetDishId = this.route.snapshot.queryParamMap.get('dishId');
        if (targetDishId) {
          const found = sortedDishes.find(d => d.id === targetDishId);
          if (found) {
            setTimeout(() => this.onDishClick(found), 150);
          }
        }
      },
      error: (error) => {
        console.error('Error cargando platillos:', error);
        this.isLoadingDishes.set(false);
      }
    });
  }

  filterByCategory(category: string) {
    if (this.selectedCategory() === category) {
      this.selectedCategory.set(null);
      this.filteredDishes.set(this.dishes());
    } else {
      this.selectedCategory.set(category);
      const filtered = this.dishes().filter(d => d.category === category);
      this.filteredDishes.set(filtered);

      setTimeout(() => {
        const element = document.getElementById(`category-${category}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  onDishClick(dish: Dish) {
    if (!dish.isAvailable) {
      alert('Este platillo no está disponible en este momento');
      return;
    }

    if (dish.allowCutleryRequest !== undefined ||
      (dish.modifiers && dish.modifiers.length > 0) ||
      (dish.requiredSelections && dish.requiredSelections.length > 0)) {
      console.log('📦 Usando platillo ya cargado:', dish);
      this.selectedDish.set(dish);
      this.showDishModal.set(true);
      this.analytics.trackEcommerce('view_item', [{ id: dish.id, price: dish.price, quantity: 1 }]);
      return;
    }

    this.isLoadingDishDetail.set(true);
    this.restaurantService.getDishById(dish.id).subscribe({
      next: (fullDish) => {
        console.log('✅ Detalle del platillo recibido:', fullDish);
        this.selectedDish.set(fullDish);
        this.showDishModal.set(true);
        this.analytics.trackEcommerce('view_item', [{ id: fullDish.id, price: fullDish.price, quantity: 1 }]);
        this.isLoadingDishDetail.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando detalle del platillo:', error);
        alert('No se pudo cargar el detalle del platillo');
        this.isLoadingDishDetail.set(false);
      }
    });
  }

  closeDishModal() {
    this.showDishModal.set(false);
    this.selectedDish.set(null);
  }

  async onAddToCart(request: AddToCartRequest) {
    const restaurant = this.restaurant();
    if (!restaurant) return;

    request.restaurantId = restaurant.id;
    request.restaurantName = restaurant.name;

    this.isAddingToCart.set(true);

    try {
      const canAdd = await firstValueFrom(this.foodCartService.validateRestaurant(restaurant.id));

      if (!canAdd) {
        const confirmClear = confirm(
          `Ya tienes items de otro restaurante en tu carrito.\n\n¿Deseas vaciar el carrito y agregar este platillo?`
        );

        if (!confirmClear) {
          this.isAddingToCart.set(false);
          return;
        }

        await firstValueFrom(this.foodCartService.clearCart());
        console.log('🗑️ Carrito vaciado');
      }

      // ✅ firstValueFrom nunca retorna undefined
      const updatedCart = await firstValueFrom(this.foodCartService.addItem(request));
      console.log('✅ Item agregado al carrito:', updatedCart);
      this.cart.set(updatedCart);
      this.analytics.trackEcommerce('add_to_cart', [{ id: request.dishId, price: request.basePrice, quantity: request.quantity }]);

      this.closeDishModal();
      alert('✅ Platillo agregado al carrito');

    } catch (error: any) {
      this.analytics.trackError('cart_add', error?.status);
      console.error('❌ Error completo:', error);

      let errorMessage = 'No se pudo agregar el platillo al carrito';

      if (error.status === 0) {
        errorMessage = '⚠️ No se puede conectar con el servidor. Verifica tu conexión.';
      } else if (error.status === 400) {
        errorMessage = error.error?.message || 'Datos inválidos';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }

      alert(errorMessage);
    } finally {
      this.isAddingToCart.set(false);
    }
  }

  // ✅ NUEVO: Ir al carrito
  goToCart() {
    this.router.navigate(['/food/cart']);
  }

  goBack() {
    this.router.navigate(['/food/catalog']);
  }
}
