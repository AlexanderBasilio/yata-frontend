import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dish, DishModifier, DishModifierOption, RequiredSelection, SelectionOption } from '../../../../core/models/restaurant.model';
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

  modifiers = computed(() => this.dish().modifiers || []);
  requiredSelections = computed(() => this.dish().requiredSelections || []);

  // Cantidad del plato principal
  quantity = signal(1);

  // Map<optionId, quantity>
  selectedModifierOptions = signal<Map<string, number>>(new Map());

  // Selecciones requeridas (ej: bebida, entrada)
  selectedRequired = signal<Map<string, string>>(new Map()); // selectionId -> optionId

  // Instrucciones especiales
  specialInstructions = signal('');

  // ✅ Precio calculado INCLUYENDO modifiers y required selections
  calculatedPrice = computed(() => {
    let total = this.dish().price;

    // Sumar opciones de modificadores seleccionadas
    this.selectedModifierOptions().forEach((qty, optionId) => {
      // Buscar la opción en todos los modifiers
      for (const modifier of this.dish().modifiers || []) {
        const option = modifier.options?.find(o => o.id === optionId);
        if (option) {
          total += option.price * qty;
          break;
        }
      }
    });

    // Sumar ajustes de selecciones requeridas
    this.selectedRequired().forEach((optionId) => {
      for (const selection of this.dish().requiredSelections || []) {
        const option = selection.options.find(o => o.id === optionId);
        if (option) {
          total += option.priceAdjustment;
          break;
        }
      }
    });

    // Multiplicar por la cantidad del plato
    return total * this.quantity();
  });

  // Validación de selecciones requeridas
  canAddToCart = computed(() => {
    const requiredSelections = this.dish().requiredSelections || [];

    for (const selection of requiredSelections) {
      const selected = this.selectedRequired().get(selection.id);

      if (!selected && selection.minSelections > 0) {
        return false;
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

  // Agregar opción de modificador
  addModifierOption(option: DishModifierOption) {
    const current = this.selectedModifierOptions();
    const qty = current.get(option.id) || 0;
    current.set(option.id, qty + 1);
    this.selectedModifierOptions.set(new Map(current));

    console.log('➕ Agregado:', option.name, 'Precio:', option.price);
    console.log('📊 Precio calculado:', this.calculatedPrice());
  }

  // Quitar opción de modificador
  removeModifierOption(optionId: string) {
    const current = this.selectedModifierOptions();
    const qty = current.get(optionId) || 0;

    if (qty > 1) {
      current.set(optionId, qty - 1);
    } else {
      current.delete(optionId);
    }

    this.selectedModifierOptions.set(new Map(current));

    console.log('➖ Removido, nuevo precio:', this.calculatedPrice());
  }

  // Obtener cantidad de una opción
  getModifierOptionQuantity(optionId: string): number {
    return this.selectedModifierOptions().get(optionId) || 0;
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

    // ✅ Construir modifiers array con la estructura correcta del backend
    const modifiers: SelectedModifier[] = [];

    this.selectedModifierOptions().forEach((qty, optionId) => {
      // Buscar la opción en todos los modifiers
      for (const modifier of this.dish().modifiers || []) {
        const option = modifier.options?.find(o => o.id === optionId);
        if (option) {
          modifiers.push({
            modifierGroupId: modifier.id,        // ← ID del grupo de modificadores
            modifierId: option.id,         // ← ID de la opción elegida
            modifierGroupName: modifier.name,     // ← Nombre del grupo
            modifierName: option.name,            // ← Nombre de la opción
            price: option.price,
            quantity: qty
          });
          break;
        }
      }
    });

    // ✅ Construir required selections array con la estructura correcta
    const requiredSelections: SelectedRequired[] = [];
    this.selectedRequired().forEach((optionId, selectionId) => {
      const selection = this.dish().requiredSelections?.find(s => s.id === selectionId);
      const option = selection?.options.find(o => o.id === optionId);
      if (selection && option) {
        requiredSelections.push({
          requiredGroupId: selection.id,           // ← ID del grupo obligatorio
          optionId: option.id,              // ← ID de la opción elegida
          requiredGroupName: selection.title,      // ← Nombre del grupo
          optionName: option.name,          // ← Nombre de la opción
          priceAdjustment: option.priceAdjustment
        });
      }
    });

    const request: AddToCartRequest = {
      dishId: this.dish().id,
      dishName: this.dish().name,           // ← NUEVO
      dishImageUrl: this.dish().imageUrl,   // ← NUEVO
      basePrice: this.dish().price,         // ← NUEVO
      quantity: this.quantity(),
      modifiers,
      requiredSelections,
      specialInstructions: this.specialInstructions().trim() || undefined,
      restaurantId: '',  // ← Lo llenaremos desde el componente padre
      restaurantName: '' // ← Lo llenaremos desde el componente padre
    };

    console.log('🛒 Request a enviar al carrito:', request.modifiers);

    this.addToCart.emit(request);
  }

  onClose() {
    this.close.emit();
  }
}
