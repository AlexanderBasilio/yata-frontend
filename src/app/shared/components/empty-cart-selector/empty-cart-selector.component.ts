import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-empty-cart-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#0D0518] pb-32 font-sans flex items-center justify-center px-4 py-8">
      <div class="empty-cart bg-gradient-to-br from-[#221638] to-[#1A0A2E] border border-[#31204F] rounded-[28px] shadow-2xl p-8 sm:p-12 text-center max-w-2xl w-full mx-auto">
        
        <div class="mb-5 flex justify-center">
          <div class="w-20 h-20 rounded-full bg-[#C30364]/10 border border-[#C30364]/30 flex items-center justify-center text-[#C30364] shadow-[0_0_20px_rgba(195,3,100,0.2)]">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <h2 class="text-xl sm:text-2xl font-bold font-['Inknut_Antiqua'] text-[#FAF8FB] mb-2">
          Selecciona un servicio primero
        </h2>
        
        <p class="text-xs sm:text-sm text-[#9D96A8] mb-8 max-w-md mx-auto">
          Aún no has seleccionado ningún servicio. Elige una opción disponible a continuación para explorar el catálogo y realizar tu pedido:
        </p>

        <!-- Botones de Selección de Servicios (Comida activo, otros bloqueados) -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-xl mx-auto">
          @for (service of serviceOptions; track service.id) {
            <button 
              (click)="selectService(service)"
              [disabled]="!service.available"
              [class.opacity-45]="!service.available"
              [class.cursor-not-allowed]="!service.available"
              [class.border-[#C30364]]="service.available"
              [class.shadow-[0_0_15px_rgba(195,3,100,0.3)]]="service.available"
              class="flex flex-col items-center gap-2 p-3 bg-[#1A0A2E] border border-[#31204F] rounded-2xl hover:border-[#C30364]/80 transition-all group relative overflow-hidden">
              
              <div class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden p-1 group-hover:scale-105 transition-transform">
                <img [src]="service.icon" [alt]="service.name" class="w-full h-full object-contain">
              </div>

              <span class="text-xs font-bold text-white">{{ service.name }}</span>

              @if (!service.available) {
                <span class="text-[9px] font-bold text-[#9D96A8] bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                  Próximamente
                </span>
              } @else {
                <span class="text-[9px] font-bold text-[#22C55E] bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  Disponible
                </span>
              }
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class EmptyCartSelectorComponent {
  private router = inject(Router);

  serviceOptions = [
    { id: 'food', name: 'Comida', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png', route: '/food/catalog', available: true },
    { id: 'liquor', name: 'Licores', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779227373/delivery-categories/licuour.png', route: '', available: false },
    { id: 'market', name: 'Mercado', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237655/delivery-categories/market.png', route: '', available: false },
    { id: 'courier', name: 'Couriers', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237691/delivery-categories/courier.png', route: '', available: false },
    { id: 'pharmacy', name: 'Farmacia', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237706/delivery-categories/farmacy.png', route: '', available: false }
  ];

  selectService(service: any) {
    if (service.available && service.route) {
      this.router.navigate([service.route]);
    }
  }
}
