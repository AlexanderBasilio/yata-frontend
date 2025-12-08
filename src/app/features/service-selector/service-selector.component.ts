import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  available: boolean;
  comingSoon?: boolean;
}

@Component({
  selector: 'app-service-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-selector.component.html',
  styleUrl: './service-selector.component.scss',
})
export class ServiceSelectorComponent {
  private router = inject(Router);

  services: Service[] = [
    {
      id: 'liquor',
      name: 'Licores y Bebidas',
      description: 'Delivery rápido de bebidas alcohólicas, cervezas, vinos y más',
      icon: '🍺',
      route: '/liquor/catalog',
      available: true
    },
    {
      id: 'food',
      name: 'Comida a Domicilio',
      description: 'Platos preparados, menús del día y más opciones deliciosas',
      icon: '🍽️',
      route: '/food/catalog',
      available: false,
      comingSoon: true
    }
  ];

  selectService(service: Service) {
    if (service.available) {
      this.router.navigate([service.route]);
    }
  }
}
