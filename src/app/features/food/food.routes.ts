import { Routes } from '@angular/router';

export const FOOD_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'catalog',
    pathMatch: 'full'
  },
  {
    path: 'catalog',
    loadComponent: () => import('./pages/restaurant-catalog/restaurant-catalog.component')
      .then(m => m.RestaurantCatalogComponent)
  },
  {
    path: 'restaurant/:id',
    loadComponent: () => import('./pages/restaurant-detail/restaurant-detail.component')
      .then(m => m.RestaurantDetailComponent)
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/food-cart/food-cart.component')
      .then(m => m.FoodCartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout.component')  // ⚠️ Dará error hasta que crees este componente
      .then(m => m.CheckoutComponent)
  }
];