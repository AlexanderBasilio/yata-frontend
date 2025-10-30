import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'catalog',
    pathMatch: 'full'
  },
  {
    path: 'catalog',
    loadChildren: () => import('./features/catalog/catalog.routes').then(m => m.CATALOG_ROUTES)
  },
  {
    path: 'cart',
    loadChildren: () => import('./features/cart/cart.routes').then(m => m.CART_ROUTES)
  },
  {
    path: 'location',
    loadChildren: () => import('./features/location/location.routes').then(m => m.LOCATION_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'catalog'
  }
];
