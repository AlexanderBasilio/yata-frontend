import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RestaurantService, Specialty } from '../../../../core/services/restaurant/restaurant.service';
import { Restaurant } from '../../../../core/models/restaurant.model';
import { RestaurantCardComponent } from '../restaurant-card/restaurant-card.component';
import { CustomerService, Address } from '../../../../core/services/customer/customer.service';

@Component({
  selector: 'app-restaurant-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, RestaurantCardComponent],
  templateUrl: './restaurant-catalog.component.html',
  styleUrl: './restaurant-catalog.component.scss'
})
export class RestaurantCatalogComponent implements OnInit {
  private restaurantService = inject(RestaurantService);
  private customerService = inject(CustomerService);
  private router = inject(Router);

  restaurants = signal<Restaurant[]>([]);
  filteredRestaurants = signal<Restaurant[]>([]);
  specialties = signal<Specialty[]>([]);
  selectedSpecialty = signal<string | null>(null);
  isLoading = signal(true);
  searchQuery = signal('');

  // Address and Zone State
  currentAddress = signal<Address | null>(null);
  customerZoneId = signal<string>('HYO_GRID_120_84'); // Default fallback

  ngOnInit() {
    this.specialties.set(this.restaurantService.getSpecialties());
    
    // Reactivamente escuchar cambios en la dirección activa del cliente
    this.customerService.activeAddress$.subscribe({
      next: (address) => {
        console.group('📍 [Catálogo Food] Dirección activa recibida');
        console.log('📦 Objeto dirección activo:', address);
        if (address) {
          this.currentAddress.set(address);
          if (address.zoneId) {
            console.log('🌍 ZoneID activo detectado:', address.zoneId);
            this.customerZoneId.set(address.zoneId);
          } else {
            console.warn('⚠️ La dirección activa NO contiene zoneId. Usando fallback:', this.customerZoneId());
          }
        } else {
          console.warn('⚠️ No hay dirección activa. Usando fallback:', this.customerZoneId());
        }
        console.groupEnd();
        this.loadRestaurants(this.customerZoneId());
      }
    });
  }

  loadRestaurants(zoneId: string) {
    this.isLoading.set(true);
    this.restaurantService.getAllRestaurants(zoneId).subscribe({
      next: (restaurants) => {
        console.log('✅ Catálogo recibido para zona ' + zoneId + ':', restaurants);
        this.restaurants.set(restaurants);
        this.filteredRestaurants.set(restaurants);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando catálogo:', error);
        this.restaurants.set([]);
        this.filteredRestaurants.set([]);
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
      this.restaurantService.searchBySpecialty(this.customerZoneId(), specialty).subscribe({
        next: (restaurants) => {
          console.log(`🔍 Catálogo con especialidad "${specialty}":`, restaurants);
          this.filteredRestaurants.set(restaurants);
        },
        error: (err) => {
          console.error('Error filtrando catálogo:', err);
          this.filteredRestaurants.set([]);
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

    // ✅ Buscar en el array de specialties
    const filtered = this.restaurants().filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.specialties.some(s => s.name.toLowerCase().includes(query))
    );
    this.filteredRestaurants.set(filtered);
  }

  onRestaurantClick(restaurant: Restaurant) {
    if (!restaurant.isOpen || restaurant.isTemporarilyClosed) {
      return;
    }
    this.router.navigate(['/food/restaurant', restaurant.id]);
  }
}
