import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RestaurantService, Specialty } from '../../../../core/services/restaurant/restaurant.service';
import { Restaurant } from '../../../../core/models/restaurant.model';
import { RestaurantCardComponent } from '../restaurant-card/restaurant-card.component';


@Component({
  selector: 'app-restaurant-catalog',
  standalone: true,
  imports: [CommonModule, RestaurantCardComponent],
  templateUrl: './restaurant-catalog.component.html',
  styleUrl: './restaurant-catalog.component.scss'
})
export class RestaurantCatalogComponent implements OnInit {
  private restaurantService = inject(RestaurantService);
  private router = inject(Router);

  restaurants = signal<Restaurant[]>([]);
  filteredRestaurants = signal<Restaurant[]>([]);
  specialties = signal<Specialty[]>([]);
  selectedSpecialty = signal<string | null>(null);
  isLoading = signal(true);
  searchQuery = signal('');

  ngOnInit() {
    this.loadRestaurants();
    this.specialties.set(this.restaurantService.getSpecialties());
  }

  loadRestaurants() {
    this.isLoading.set(true);
    this.restaurantService.getAllRestaurants().subscribe({
      next: (restaurants) => {
        console.log('✅ Restaurantes recibidos:', restaurants);
        this.restaurants.set(restaurants);
        this.filteredRestaurants.set(restaurants);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando restaurantes:', error);
        this.isLoading.set(false);
      }
    });
  }

  filterBySpecialty(specialty: string) {
    if (this.selectedSpecialty() === specialty) {
      // Deseleccionar
      this.selectedSpecialty.set(null);
      this.filteredRestaurants.set(this.restaurants());
    } else {
      // Seleccionar y filtrar
      this.selectedSpecialty.set(specialty);
      this.restaurantService.searchBySpecialty(specialty).subscribe({
        next: (restaurants) => {
          console.log(`🔍 Restaurantes con especialidad "${specialty}":`, restaurants);
          this.filteredRestaurants.set(restaurants);
        }
      });
    }
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchQuery.set(query);

    if (!query) {
      this.filteredRestaurants.set(this.restaurants());
      return;
    }

    // ✅ AJUSTADO: Buscar en el array de specialties
    const filtered = this.restaurants().filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.specialties.some(s => s.name.toLowerCase().includes(query))
    );
    this.filteredRestaurants.set(filtered);
  }

  onRestaurantClick(restaurant: Restaurant) {
    this.router.navigate(['/food/restaurant', restaurant.id]);
  }
}
