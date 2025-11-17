import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-info-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="info-table flex border-[3px] border-[#E3C699] rounded-2xl h-[6.5vh] w-[90vw] mx-auto mb-2">
      <div class="flex flex-col justify-center items-center w-1/2 relative after:content-[''] after:absolute after:right-0 after:top-[15%] after:h-[70%] after:w-[2px] after:bg-[#E3C699]">
        <h3 class="text-[#0F456E] font-semibold text-sm">Tiempo de entrega</h3>
        <h3 class="text-[#0F456E] font-bold">{{ deliveryTime() }}</h3>
      </div>
      <div class="flex flex-col justify-center items-center w-1/2">
        <h3 class="text-[#0F456E] font-semibold text-sm">Acumula IntiCoins</h3>
        <h3 class="text-[#0F456E] font-bold">{{ shippingCost() }}</h3>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class InfoTableComponent {
  deliveryTime = input<string>('15 - 35 min');
  shippingCost = input<string>('Por cada pedido');
}
