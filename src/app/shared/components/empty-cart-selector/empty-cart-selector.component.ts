import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-empty-cart-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#0D0518] pb-24 font-sans flex flex-col items-center justify-center px-6 text-center">
      <div class="w-24 h-24 bg-[#221638] rounded-full flex items-center justify-center shadow-lg border border-[#31204F] mb-6">
        <svg class="w-12 h-12 text-[#C30364]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      
      <h2 class="text-2xl font-bold font-['Inknut_Antiqua'] text-[#FAF8FB] mb-3">
        ¡Tu carrito está esperando!
      </h2>
      
      <p class="text-[#9D96A8] text-sm mb-8 max-w-xs mx-auto">
        Primero selecciona una sección para empezar a llenar tu carrito con nuestros productos.
      </p>

      <div class="flex flex-col gap-4 w-full max-w-xs">
        <button (click)="goFood()" class="w-full bg-gradient-to-br from-[#C30364] to-[#E8368A] text-white py-3.5 rounded-xl font-bold text-base shadow-[0_4px_15px_rgba(195,3,100,0.4)] hover:scale-105 transition-transform">
          Ver Comidas
        </button>
      </div>
    </div>
  `
})
export class EmptyCartSelectorComponent {
  private router = inject(Router);

  goFood() {
    this.router.navigate(['/food/catalog']);
  }

  goLiquor() {
    this.router.navigate(['/liquor/catalog']);
  }
}
