import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-catalog-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- <div class="bg-white h-[60px] px-4 rounded-[30px] flex items-center gap-3 shadow-lg">
      <span class="w-5 h-5 flex items-center justify-center text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </span>
      <input
        type="text"
        [(ngModel)]="searchQuery"
        (input)="onSearch()"
        placeholder="Buscar en {{ storeName() }}"
        class="flex-1 outline-none text-gray-500 font-semibold placeholder:font-normal"
      >
    </div>  DESCOMENTAR MAS ADELANTE -->
  `
})
export class CatalogSearchComponent {
  searchQuery = '';
  storeName = signal('ROQUITO STORE');

  onSearch() {
    console.log('Buscando:', this.searchQuery);
  }
}
