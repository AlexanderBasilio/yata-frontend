import { Routes } from '@angular/router';

export const MARKET_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'catalog',
    pathMatch: 'full'
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./pages/market-catalog/market-catalog.component').then(m => m.MarketCatalogComponent)
  },
  {
    path: 'store/:storeId',
    loadComponent: () =>
      import('./pages/market-store-detail/market-store-detail.component').then(
        m => m.MarketStoreDetailComponent
      )
  },
  {
    path: 'store/:id',
    loadComponent: () =>
      import('./pages/market-store-detail/market-store-detail.component').then(
        m => m.MarketStoreDetailComponent
      )
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./pages/market-cart/market-cart.component').then(m => m.MarketCartComponent)
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/market-checkout/market-checkout.component').then(m => m.MarketCheckoutComponent)
  },
  {
    path: 'order/:orderCode',
    loadComponent: () =>
      import('./pages/market-order-confirmation/market-order-confirmation.component').then(
        m => m.MarketOrderConfirmationComponent
      )
  }
];
