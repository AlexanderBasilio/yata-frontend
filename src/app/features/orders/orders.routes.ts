import { Routes } from '@angular/router';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/order-history/order-history.component')
      .then(m => m.OrderHistoryComponent)
  }
];
