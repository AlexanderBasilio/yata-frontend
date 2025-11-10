import { Routes } from '@angular/router';
import { storeHoursGuard } from './core/guards/store-hours.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'catalog',
    pathMatch: 'full'
  },
  {
    path: 'catalog',
    loadChildren: () => import('./features/catalog/catalog.routes').then(m => m.CATALOG_ROUTES),
    canActivate: [storeHoursGuard]
  },
  {
    path: 'cart',
    loadChildren: () => import('./features/cart/cart.routes').then(m => m.CART_ROUTES),
    canActivate: [storeHoursGuard]
  },
  {
    path: 'location',
    loadChildren: () => import('./features/location/location.routes').then(m => m.LOCATION_ROUTES),
    canActivate: [storeHoursGuard]
  },
  {
    path: 'closed',
    loadChildren: () => import('./features/service-status/service-status.routes').then(m => m.SERVICE_STATUS_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'catalog'
  }
];
