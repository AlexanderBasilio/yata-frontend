import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketCartService } from '../../../../core/services/market/market-cart.service';

@Component({
  selector: 'app-proximity-conflict-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (cartService.showConflictModal()) {
      <div
        class="fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      >
        <div
          class="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-gray-100 text-center animate-slide-up"
        >
          <!-- Warning Icon -->
          <div
            class="w-16 h-16 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner"
          >
            🏪
          </div>

          <h3 class="text-lg font-bold text-[#1A0A2E] font-['Inknut_Antiqua'] leading-snug mb-2">
            ¿Deseas iniciar un nuevo carrito?
          </h3>

          <p class="text-xs text-gray-600 leading-relaxed mb-6">
            Ya tienes productos de
            <span class="font-bold text-[#1A0A2E]">{{
              cartService.conflictData()?.currentStoreName || 'otro comercio'
            }}</span
            >. Por la distancia entre puestos (máximo 100 m para envíos en conjunto), no es posible combinarlos en
            un solo pedido.
          </p>

          <div class="flex flex-col gap-2.5">
            <button
              type="button"
              (click)="onClearAndAdd()"
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C30364] to-[#E8368A] text-white font-bold text-xs shadow-[0_4px_16px_rgba(195,3,100,0.35)] hover:brightness-110 active:scale-98 transition-all cursor-pointer"
            >
              Vaciar y comprar aquí
            </button>

            <button
              type="button"
              (click)="onCancel()"
              class="w-full py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-98 transition-all cursor-pointer"
            >
              Mantener carrito actual
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ProximityConflictModalComponent {
  public cartService = inject(MarketCartService);

  onClearAndAdd() {
    this.cartService.resolveConflictClearAndAdd().subscribe();
  }

  onCancel() {
    this.cartService.dismissConflict();
  }
}
