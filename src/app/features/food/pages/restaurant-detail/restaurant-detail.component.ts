import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RestaurantService } from '../../../../core/services/restaurant/restaurant.service';
import { FoodCartService } from '../../../../core/services/food-cart/food-cart.service';
import { Restaurant, Dish } from '../../../../core/models/restaurant.model';
import { AddToCartRequest } from '../../../../core/models/food-cart.model';
import { DishCardComponent } from '../../components/dish-card/dish-card.component';
import { DishModalComponent } from '../../components/dish-modal/dish-modal.component';

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

  restaurant = signal<Restaurant | null>(null);
  dishes = signal<Dish[]>([]);
  filteredDishes = signal<Dish[]>([]);
  categories = signal<string[]>([]);
  selectedCategory = signal<string | null>(null);

  // Modal
  showDishModal = signal(false);
  selectedDish = signal<Dish | null>(null);

  isLoadingRestaurant = signal(true);
  isLoadingDishes = signal(true);
  isAddingToCart = signal(false);

  // Ubicación completa del restaurante
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
  }

  loadRestaurant(id: string) {
    this.isLoadingRestaurant.set(true);
    this.restaurantService.getRestaurantById(id).subscribe({
      next: (restaurant) => {
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
        this.dishes.set(dishes);
        this.filteredDishes.set(dishes);

        // Extraer categorías únicas
        const uniqueCategories = [...new Set(dishes.map(d => d.category))];
        this.categories.set(uniqueCategories);

        this.isLoadingDishes.set(false);
      },
      error: (error) => {
        console.error('Error cargando platillos:', error);
        this.isLoadingDishes.set(false);
      }
    });
  }

  filterByCategory(category: string) {
    if (this.selectedCategory() === category) {
      // Deseleccionar
      this.selectedCategory.set(null);
      this.filteredDishes.set(this.dishes());
    } else {
      // Seleccionar y filtrar
      this.selectedCategory.set(category);
      const filtered = this.dishes().filter(d => d.category === category);
      this.filteredDishes.set(filtered);

      // Scroll al primer platillo de esta categoría
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

    this.selectedDish.set(dish);
    this.showDishModal.set(true);
  }

  closeDishModal() {
    this.showDishModal.set(false);
    this.selectedDish.set(null);
  }

  async onAddToCart(request: AddToCartRequest) {
    const restaurant = this.restaurant();
    if (!restaurant) return;

    this.isAddingToCart.set(true);

    try {
      // Primero validar si se puede agregar de este restaurante
      const validation = await this.foodCartService.validateRestaurant(restaurant.id).toPromise();

      if (!validation?.canAdd) {
        const confirmClear = confirm(
          `Ya tienes items de otro restaurante en tu carrito.\n\n${validation?.message || ''}\n\n¿Deseas vaciar el carrito y agregar este platillo?`
        );

        if (!confirmClear) {
          this.isAddingToCart.set(false);
          return;
        }

        // Vaciar carrito
        await this.foodCartService.clearCart().toPromise();
      }

      // Agregar al carrito
      await this.foodCartService.addItem(request).toPromise();

      // Cerrar modal
      this.closeDishModal();

      // Mostrar confirmación
      alert('✅ Platillo agregado al carrito');

    } catch (error: any) {
      console.error('Error al agregar al carrito:', error);
      alert(error?.error?.message || 'No se pudo agregar el platillo al carrito');
    } finally {
      this.isAddingToCart.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/food/catalog']);
  }
}
