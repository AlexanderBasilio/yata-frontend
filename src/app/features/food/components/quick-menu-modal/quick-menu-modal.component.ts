import { Component, input, output, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Restaurant, RestaurantQuickMenuResponse, QuickMenuItemResponse } from '../../../../core/models/restaurant.model';
import { BottomNavService } from '../../../../core/services/bottom-nav/bottom-nav.service';

export interface SelectedQuickItem {
  item: QuickMenuItemResponse;
  quantity: number;
}

@Component({
  selector: 'app-quick-menu-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-menu-modal.component.html',
  styleUrl: './quick-menu-modal.component.scss'
})
export class QuickMenuModalComponent implements OnInit, OnDestroy {
  private bottomNavService = inject(BottomNavService);

  restaurant = input<Restaurant | null>(null);
  quickMenu = input<RestaurantQuickMenuResponse | null>(null);
  isLoading = input<boolean>(false);
  close = output<void>();

  ngOnInit(): void {
    this.bottomNavService.hide();
  }

  ngOnDestroy(): void {
    this.bottomNavService.show();
  }

  // Filtro o búsqueda rápida dentro de la carta
  searchTerm = signal('');
  selectedCategory = signal<string | null>(null);

  // Mapa de platos seleccionados: itemId -> SelectedQuickItem
  selectedItemsMap = signal<Map<string, SelectedQuickItem>>(new Map());

  // Modal de confirmación para WhatsApp
  showWhatsappConfirm = signal(false);

  // Toast de copiado al portapapeles
  toastMessage = signal<string | null>(null);
  private toastTimeout: any;

  // Categorías filtradas por búsqueda
  filteredCategories = computed(() => {
    const data = this.quickMenu();
    if (!data || !data.categories) return [];

    const search = this.searchTerm().trim().toLowerCase();
    const activeCat = this.selectedCategory();

    return data.categories
      .filter(cat => !activeCat || cat.categoryName === activeCat)
      .map(cat => {
        if (!search) return cat;
        return {
          ...cat,
          items: cat.items.filter(item =>
            item.name.toLowerCase().includes(search)
          )
        };
      })
      .filter(cat => cat.items.length > 0);
  });

  // Lista de todas las categorías disponibles
  categoryNames = computed(() => {
    const data = this.quickMenu();
    if (!data || !data.categories) return [];
    return data.categories.map(c => c.categoryName);
  });

  // Total de platillos seleccionados
  totalSelectedCount = computed(() => {
    let count = 0;
    for (const val of this.selectedItemsMap().values()) {
      count += val.quantity;
    }
    return count;
  });

  // Subtotal en soles de los platillos seleccionados
  selectedSubtotal = computed(() => {
    let total = 0;
    for (const val of this.selectedItemsMap().values()) {
      total += val.item.price * val.quantity;
    }
    return total;
  });

  // Cargo adicional por atención WhatsApp
  readonly whatsappServiceFee = 0.60;

  // Total estimado por WhatsApp (subtotal + cargo)
  whatsappEstimatedTotal = computed(() => {
    return this.selectedSubtotal() + this.whatsappServiceFee;
  });

  toggleItemSelection(item: QuickMenuItemResponse) {
    const current = new Map(this.selectedItemsMap());
    if (current.has(item.id)) {
      current.delete(item.id);
    } else {
      current.set(item.id, { item, quantity: 1 });
    }
    this.selectedItemsMap.set(current);
  }

  isItemSelected(itemId: string): boolean {
    return this.selectedItemsMap().has(itemId);
  }

  getItemQuantity(itemId: string): number {
    return this.selectedItemsMap().get(itemId)?.quantity || 1;
  }

  updateItemQuantity(item: QuickMenuItemResponse, delta: number, event: Event) {
    event.stopPropagation();
    const current = new Map(this.selectedItemsMap());
    const existing = current.get(item.id);
    if (!existing) {
      if (delta > 0) {
        current.set(item.id, { item, quantity: 1 });
      }
    } else {
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        current.delete(item.id);
      } else {
        current.set(item.id, { item, quantity: newQty });
      }
    }
    this.selectedItemsMap.set(current);
  }

  clearSelection() {
    this.selectedItemsMap.set(new Map());
  }

  selectCategoryFilter(category: string | null) {
    this.selectedCategory.set(category);
  }

  /**
   * Copiar al portapapeles el resumen de la carta o del pedido
   */
  async copyToClipboard() {
    const restName = this.quickMenu()?.restaurantName || this.restaurant()?.name || 'Restaurante';
    const items = Array.from(this.selectedItemsMap().values());

    let text = '';
    if (items.length > 0) {
      text = `📋 *PEDIDO - ${restName.toUpperCase()}*\n\n`;
      items.forEach(i => {
        const itemTotal = (i.item.price * i.quantity).toFixed(2);
        text += `• ${i.quantity}x ${i.item.name} - S/ ${itemTotal}\n`;
      });
      text += `\n*Subtotal:* S/ ${this.selectedSubtotal().toFixed(2)}`;
    } else {
      // Copiar carta completa
      text = `📜 *CARTA RÁPIDA - ${restName.toUpperCase()}*\n\n`;
      const categories = this.quickMenu()?.categories || [];
      categories.forEach(cat => {
        text += `📍 *${cat.categoryName.toUpperCase()}*\n`;
        cat.items.forEach(it => {
          text += `  • ${it.name} - S/ ${it.price.toFixed(2)}\n`;
        });
        text += '\n';
      });
    }

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('✅ ¡Copiado al portapapeles con éxito!');
    } catch {
      this.showToast('⚠️ No se pudo copiar automáticamente');
    }
  }

  /**
   * Clic en "Pedir por WhatsApp"
   */
  onWhatsappClick() {
    if (this.totalSelectedCount() === 0) {
      this.showToast('👉 Por favor selecciona al menos un plato de la lista');
      return;
    }
    // Desplegar el modal de confirmación informando el costo adicional y pérdida de beneficios
    this.showWhatsappConfirm.set(true);
  }

  closeWhatsappConfirm() {
    this.showWhatsappConfirm.set(false);
  }

  /**
   * Confirmación final y redirección a WhatsApp
   */
  proceedToWhatsapp() {
    this.showWhatsappConfirm.set(false);

    const restName = this.quickMenu()?.restaurantName || this.restaurant()?.name || 'el Restaurante';
    const items = Array.from(this.selectedItemsMap().values());

    // Construcción del mensaje estricto: nombre restaurante, platos seleccionados (sin modifiers), precios y costo adicional
    let message = `👋 ¡Hola! Vengo desde Zisify y deseo realizar el siguiente pedido a *${restName}*:\n\n`;
    message += `🍽️ *Detalle del Pedido:*\n`;

    items.forEach(i => {
      const lineTotal = (i.item.price * i.quantity).toFixed(2);
      message += `• ${i.quantity}x ${i.item.name} - S/ ${lineTotal}\n`;
    });

    message += `\n📋 *Resumen Económico:*\n`;
    message += `• Subtotal platos: S/ ${this.selectedSubtotal().toFixed(2)}\n`;
    message += `• Cargo adicional atención WhatsApp: S/ ${this.whatsappServiceFee.toFixed(2)}\n`;
    message += `• *Total estimado:* S/ ${this.whatsappEstimatedTotal().toFixed(2)}\n\n`;
    message += `📍 Por favor confírmenme el costo de envío a mi ubicación y los métodos de pago. ¡Gracias!`;

    // Obtener teléfono del restaurante
    const rest = this.restaurant();
    const rawPhone = (rest as any)?.phoneNumber || (rest as any)?.phone || (rest as any)?.contactPhone || (rest as any)?.whatsappNumber || '';
    let cleanPhone = rawPhone.toString().replace(/\D/g, '');

    // Si es un número peruano de 9 dígitos (9xxxxxxxx), anteponer 51
    if (cleanPhone.length === 9 && cleanPhone.startsWith('9')) {
      cleanPhone = `51${cleanPhone}`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  }

  private showToast(msg: string) {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage.set(msg);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3200);
  }
}
