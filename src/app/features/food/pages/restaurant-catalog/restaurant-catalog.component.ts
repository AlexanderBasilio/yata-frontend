import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RestaurantService, Specialty } from '../../../../core/services/restaurant/restaurant.service';
import { Restaurant } from '../../../../core/models/restaurant.model';
import { RestaurantCardComponent } from '../restaurant-card/restaurant-card.component';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { CustomerService, Address } from '../../../../core/services/customer/customer.service';

@Component({
  selector: 'app-restaurant-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RestaurantCardComponent],
  templateUrl: './restaurant-catalog.component.html',
  styleUrl: './restaurant-catalog.component.scss'
})
export class RestaurantCatalogComponent implements OnInit {
  private restaurantService = inject(RestaurantService);
  private authService = inject(AuthService);
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
  customerAddresses = signal<Address[]>([]);
  customerZoneId = signal<string>('HYO_GRID_120_84'); // Default fallback

  // Modals
  showAddressModal = signal(false);
  showAddAddressModal = signal(false);

  // Form State for new Address
  newLabel = signal('Casa');
  newStreetAddress = signal('');
  newReference = signal('');
  newCity = signal('HUANCAYO');
  newLatitude = signal(-12.04637);
  newLongitude = signal(-75.21128);
  isSavingAddress = signal(false);

  ngOnInit() {
    this.specialties.set(this.restaurantService.getSpecialties());
    this.loadCustomerProfileAndCatalog();
  }

  loadCustomerProfileAndCatalog() {
    const userId = this.authService.getUserId();
    if (!userId) {
      // Fallback for anonymous users
      this.loadRestaurants(this.customerZoneId());
      return;
    }

    this.isLoading.set(true);
    this.customerService.getCustomerProfile(userId).subscribe({
      next: (profile) => {
        const addresses = profile.addresses || [];
        this.customerAddresses.set(addresses);
        
        // Find default address
        const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
        if (defaultAddress) {
          this.currentAddress.set(defaultAddress);
          if (defaultAddress.zoneId) {
            this.customerZoneId.set(defaultAddress.zoneId);
          }
        }
        
        this.loadRestaurants(this.customerZoneId());
      },
      error: (err) => {
        console.error('Error loading customer profile, using default zone:', err);
        this.loadRestaurants(this.customerZoneId());
      }
    });
  }

  loadRestaurants(zoneId: string) {
    this.isLoading.set(true);
    this.restaurantService.getAllRestaurants(zoneId).subscribe({
      next: (restaurants) => {
        console.log('✅ Restaurantes recibidos para zona ' + zoneId + ':', restaurants);
        this.restaurants.set(restaurants);
        this.filteredRestaurants.set(restaurants);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error cargando restaurantes:', error);
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
          console.log(`🔍 Restaurantes con especialidad "${specialty}":`, restaurants);
          this.filteredRestaurants.set(restaurants);
        },
        error: (err) => {
          console.error('Error filtering by specialty:', err);
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

  selectAddress(address: Address) {
    this.currentAddress.set(address);
    if (address.zoneId) {
      this.customerZoneId.set(address.zoneId);
    }
    this.showAddressModal.set(false);
    
    // Re-load catalog with new zoneId
    this.loadRestaurants(this.customerZoneId());
  }

  openAddressModal() {
    this.showAddressModal.set(true);
  }

  closeAddressModal() {
    this.showAddressModal.set(false);
  }

  openAddAddressModal() {
    this.showAddAddressModal.set(true);
  }

  closeAddAddressModal() {
    this.showAddAddressModal.set(false);
  }

  saveNewAddress() {
    const userId = this.authService.getUserId();
    if (!userId) {
      alert('Debes iniciar sesión para guardar direcciones.');
      return;
    }

    if (!this.newStreetAddress().trim()) {
      alert('Por favor ingresa la dirección.');
      return;
    }

    this.isSavingAddress.set(true);
    const newAddr: Address = {
      label: this.newLabel(),
      streetAddress: this.newStreetAddress().trim(),
      reference: this.newReference().trim() || undefined,
      city: this.newCity().toUpperCase(),
      latitude: this.newLatitude(),
      longitude: this.newLongitude(),
      isDefault: true // Always set default for new registered address as per flow specs
    };

    this.customerService.addAddress(userId, newAddr).subscribe({
      next: () => {
        console.log('✅ Dirección agregada exitosamente.');
        // Clear inputs
        this.newStreetAddress.set('');
        this.newReference.set('');
        
        // Close modals
        this.showAddAddressModal.set(false);
        this.showAddressModal.set(false);
        this.isSavingAddress.set(false);

        // Re-load profile to get recalculated zoneId and reload catalog
        this.loadCustomerProfileAndCatalog();
      },
      error: (err) => {
        console.error('❌ Error guardando dirección:', err);
        alert('Hubo un error al registrar la dirección.');
        this.isSavingAddress.set(false);
      }
    });
  }
}
