import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Category {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="categories-grid grid grid-cols-4 gap-4 px-3 py-4">
      @for (category of categories(); track category.id) {
        <a
          [href]="'#' + category.id"
          class="category text-center cursor-pointer block"
          (click)="onCategoryClick($event, category.id)">
          <div class="w-full aspect-square rounded-2xl bg-white flex items-center justify-center mb-2 hover:shadow-md transition-shadow">
            <img [src]="category.icon" [alt]="category.name" class="w-22 h-22 object-contain">
          </div>
          <p class="text-xs font-medium text-gray-800 leading-tight">{{ category.name }}</p>
        </a>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    a { text-decoration: none; }
  `]
})
export class CategoryListComponent {
  categories = signal<Category[]>([
    { id: 'bebidas-sin-alcohol',
      name: 'Bebidas sin Alcohol',
      icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761405125/bebidas-sin-alcohol-category_wphgt2.png'
    },
    { id: 'whisky',
      name: 'Whisky',
      icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761405686/whisky-category_pleopf.png'
    },
    { id: 'listos-para-tomar',
      name: 'Listos para Beber',
      icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761078939/hard-seltzers-category_xtlgqd.png'
    },
    { id: 'vinos',
      name: 'Vinos',
      icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761079267/vinos-category_tuwrpb.png'
    },
    { id: 'cervezas',
      name: 'Cervezas',
      icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761078925/cervezas-category_mhwbkm.png'
    },
    { id: 'cigarrillos-vapes',
      name: 'Cigarrillos y Vaporizadores',
      icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761078935/cigarrillos-y-vaporizadores-category_stwd22.png'
    },
    { id: 'aperitivos',
      name: 'Licores y Aperitivos',
      icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761078946/licores-y-aperitivos-category_xmidpl.png'
    },
    { id: 'otros-licores',
      name: 'Otros Licores',
      icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1761078969/otros-licores-category_gwozzo.png'
    }
  ]);

  onCategoryClick(event: Event, categoryId: string) {
    event.preventDefault(); // Evitar salto brusco

    const element = document.getElementById(categoryId);
    if (element) {
      // Scroll suave con offset (para compensar header fijo)
      const offset = 80; // Altura del header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
}
