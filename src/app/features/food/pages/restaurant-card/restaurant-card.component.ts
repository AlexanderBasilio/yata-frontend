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

  // ✅ NUEVO: Extraer nombres de especialidades
  specialtyNames = computed(() => {
    return this.restaurant().specialties.map(s => s.name);
  });

  // Computed para mostrar ubicación completa
  fullLocation = computed(() => {
    const r = this.restaurant();
    return `${r.district}, ${r.city}`;
  });
}
