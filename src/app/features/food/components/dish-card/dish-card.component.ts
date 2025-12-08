import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dish } from '../../../../core/models/restaurant.model';

@Component({
  selector: 'app-dish-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dish-card.component.html',
  styleUrl: './dish-card.component.scss'
})
export class DishCardComponent {
  dish = input.required<Dish>();

  // ✅ AGREGAR ESTOS COMPUTED SIGNALS
  modifiers = computed(() => this.dish().modifiers || []);
  requiredSelections = computed(() => this.dish().requiredSelections || []);
}
