import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dish, DishModifier, RequiredSelection, SelectionOption } from '../../../../core/models/restaurant.model';
import { AddToCartRequest, SelectedModifier, SelectedRequired } from '../../../../core/models/food-cart.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dish-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dish-modal.component.html',
  styleUrl: './dish-modal.component.scss'
})
export class DishModalComponent {
  dish = input.required<Dish>();
  close = output<void>();
  addToCart = output<AddToCartRequest>();

  // ✅ AGREGAR ESTOS COMPUTED SIGNALS
  modifiers = computed(() => this.dish().modifiers || []);
  requiredSelections = computed(() => this.dish().requiredSelections || []);

  // Cantidad del plato principal
  quantity = signal(1);

  // Modificadores opcionales seleccionados
  selectedModifiers = signal<Map<string, number>>(new Map());

  // Selecciones requeridas (ej: bebida, entrada)
  selectedRequired = signal<Map<string, string>>(new Map()); // selectionId -> optionId

  // Instrucciones especiales
  specialInstructions = signal('');

  // Precio calculado
  calculatedPrice = computed(() => {
    let total = this.dish().price;

    // Sumar modificadores opcionales
    this.selectedModifiers().forEach((qty, modifierId) => {
      const modifier = this.dish().modifiers?.find(m => m.id === modifierId);
      if (modifier) {
        total += modifier.price * qty;
      }
    });

    // Sumar ajustes de selecciones requeridas
    this.selectedRequired().forEach((optionId, selectionId) => {
      const selection = this.dish().requiredSelections?.find(s => s.id === selectionId);
      const option = selection?.options.find(o => o.id === optionId);
      if (option) {
        total += option.priceAdjustment;
      }
    });

    return total * this.quantity();
  });

  // Validación de selecciones requeridas
  canAddToCart = computed(() => {
    const requiredSelections = this.dish().requiredSelections || [];

    // Verificar que todas las selecciones requeridas estén completas
    for (const selection of requiredSelections) {
      const selected = this.selectedRequired().get(selection.id);

      if (!selected && selection.minSelections > 0) {
        return false; // Falta una selección obligatoria
      }
    }

    return true;
  });

  // Aumentar cantidad del plato principal
  increaseQuantity() {
    this.quantity.update(q => q + 1);
  }

  // Disminuir cantidad del plato principal
  decreaseQuantity() {
    if (this.quantity() > 1) {
      this.quantity.update(q => q - 1);
    }
  }

  // Agregar modificador opcional
  addModifier(modifier: DishModifier) {
    const current = this.selectedModifiers();
    const qty = current.get(modifier.id) || 0;
    current.set(modifier.id, qty + 1);
    this.selectedModifiers.set(new Map(current));
  }

  // Quitar modificador opcional
  removeModifier(modifierId: string) {
    const current = this.selectedModifiers();
    const qty = current.get(modifierId) || 0;

    if (qty > 1) {
      current.set(modifierId, qty - 1);
    } else {
      current.delete(modifierId);
    }

    this.selectedModifiers.set(new Map(current));
  }

  // Obtener cantidad de un modificador
  getModifierQuantity(modifierId: string): number {
    return this.selectedModifiers().get(modifierId) || 0;
  }

  // Seleccionar opción requerida
  selectRequired(selectionId: string, optionId: string) {
    const current = this.selectedRequired();
    current.set(selectionId, optionId);
    this.selectedRequired.set(new Map(current));
  }

  // Verificar si una opción está seleccionada
  isRequiredSelected(selectionId: string, optionId: string): boolean {
    return this.selectedRequired().get(selectionId) === optionId;
  }

  // Agregar al carrito
  onAddToCart() {
    if (!this.canAddToCart()) {
      alert('Por favor completa todas las selecciones requeridas');
      return;
    }

    // Construir modifiers array
    const modifiers: SelectedModifier[] = [];
    this.selectedModifiers().forEach((qty, modifierId) => {
      const modifier = this.dish().modifiers?.find(m => m.id === modifierId);
      if (modifier) {
        modifiers.push({
          modifierId: modifier.id,
          name: modifier.name,
          price: modifier.price,
          quantity: qty
        });
      }
    });

    // Construir required selections array
    const requiredSelections: SelectedRequired[] = [];
    this.selectedRequired().forEach((optionId, selectionId) => {
      const selection = this.dish().requiredSelections?.find(s => s.id === selectionId);
      const option = selection?.options.find(o => o.id === optionId);
      if (selection && option) {
        requiredSelections.push({
          selectionId: selection.id,
          optionId: option.id,
          optionName: option.name,
          priceAdjustment: option.priceAdjustment
        });
      }
    });

    const request: AddToCartRequest = {
      dishId: this.dish().id,
      quantity: this.quantity(),
      modifiers,
      requiredSelections,
      specialInstructions: this.specialInstructions().trim() || undefined
    };

    this.addToCart.emit(request);
  }

  onClose() {
    this.close.emit();
  }
}
