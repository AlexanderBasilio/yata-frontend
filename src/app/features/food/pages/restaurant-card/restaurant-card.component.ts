import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Restaurant } from '../../../../core/models/restaurant.model';

@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurant-card.component.html',
  styleUrl: './restaurant-card.component.scss'
})
export class RestaurantCardComponent {
  restaurant = input.required<Restaurant>();

  readonly fallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80';
  readonly fallbackLogo = 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png';

  // Extraer nombres de especialidades de forma segura
  specialtyNames = computed(() => {
    return (this.restaurant().specialties || []).map(s => (typeof s === 'string' ? s : s.name));
  });

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== this.fallbackImage) {
      target.src = this.fallbackImage;
    }
  }

  onLogoError(event: Event) {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== this.fallbackLogo) {
      target.src = this.fallbackLogo;
    }
  }
}
