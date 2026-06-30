import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { CustomerService } from '../../core/services/customer/customer.service';

interface Category {
  id: string;
  name: string;
  icon: string;
  route: string;
  available: boolean;
}

@Component({
  selector: 'app-service-selector',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './service-selector.component.html',
  styleUrl: './service-selector.component.scss',
})
export class ServiceSelectorComponent implements OnInit {
  private router = inject(Router);
  public authService = inject(AuthService);
  private customerService = inject(CustomerService);

  customerName = 'Zisify';
  walletBalance = '950.000';
  ordersCount = 21;
  pointsCount = 56;
  referidosCount = 3;

  categories: Category[] = [
    { id: 'food', name: 'Comida', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1778979776/delivery-categories/food.png', route: '/food/catalog', available: true },
    { id: 'liquor', name: 'Licores', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779227373/delivery-categories/licuour.png', route: '/liquor/catalog', available: false },
    { id: 'market', name: 'Mercado', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237655/delivery-categories/market.png', route: '/market', available: false },
    { id: 'courier', name: 'Couriers', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237691/delivery-categories/courier.png', route: '/courier', available: false },
    { id: 'pharmacy', name: 'Farmacia', icon: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779237706/delivery-categories/farmacy.png', route: '/pharmacy', available: false }
  ];

  promotions = [
    { id: 5, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779233021/interface-assets/banner-hamburguesas.png', title: 'Envío gratis en tu 1er pedido' },
    { id: 6, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779233256/interface-assets/banner-pasta.png', title: 'Referidos - Próximamente' },
    { id: 1, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779232976/interface-assets/banner-polleria.png', title: 'Pollerías - Próximamente' },
    { id: 2, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779233021/interface-assets/banner-hamburguesas.png', title: 'Hamburguesas - Próximamente' },
    { id: 3, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779233256/interface-assets/banner-pasta.png', title: 'Pastas - Próximamente' },
    { id: 4, image: 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1779232461/interface-assets/banner-chifa.png', title: 'Chifas - Próximamente' }
  ];

  shortcuts = [
    { id: 'last_order', name: 'Último Pedido', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', route: '/orders' },
    { id: 'favorites', name: 'Favoritos', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', route: '/favorites' },
    { id: 'promos', name: 'Cupones', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', route: '/vouchers' }
  ];

  isUrl(icon: string): boolean {
    return icon.startsWith('http');
  }

  ngOnInit() {
    this.customerName = 'Zisify';
  }

  selectCategory(category: Category) {
    if (category.available) {
      this.router.navigate([category.route]);
    }
  }

  clickShortcut(shortcut: any) {
    if (shortcut.id === 'last_order') {
      this.router.navigate([shortcut.route]);
    } else {
      alert(`${shortcut.name} estará disponible próximamente.`);
    }
  }
}
