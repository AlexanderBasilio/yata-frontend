import { Routes } from '@angular/router';
import { storeHoursGuard } from './core/guards/store-hours.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ============================================
  // 1. ROOT - REDIRIGE A LANDING
  // ============================================
  {
    path: '',
    redirectTo: 'zisify',
    pathMatch: 'full'
  },

  // ============================================
  // LANDING PAGE (PÚBLICO)
  // ============================================
  {
    path: 'zisify',
    loadComponent: () => import('./features/landing/landing.component')
      .then(m => m.LandingComponent)
  },

  // ============================================
  // 2. AUTH (PÚBLICO)
  // ============================================
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  // ============================================
  // 3. HOME / SERVICE SELECTOR (PROTEGIDO)
  // ============================================
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/service-selector/service-selector.component')
      .then(m => m.ServiceSelectorComponent)
  },

  // ============================================
  // PROFILE (PROTEGIDO)
  // ============================================
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component')
      .then(m => m.ProfileComponent)
  },

  // ============================================
  // WALLET (PROTEGIDO)
  // ============================================
  {
    path: 'wallet',
    canActivate: [authGuard],
    loadComponent: () => import('./features/wallet/wallet.component')
      .then(m => m.WalletComponent)
  },

  // ============================================
  // ORDERS (PROTEGIDO)
  // ============================================
  {
    path: 'orders',
    canActivate: [authGuard],
    loadChildren: () => import('./features/orders/orders.routes').then(m => m.ORDERS_ROUTES)
  },

  // ============================================
  // 4. SERVICIO DE LICORES (PROTEGIDO)
  // ============================================
  {
    path: 'liquor',
    canActivate: [authGuard, storeHoursGuard],
    children: [
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
      }
    ]
  },

  // ============================================
  // 5. SERVICIO DE COMIDA (PROTEGIDO)
  // ============================================
  {
    path: 'food',
    canActivate: [authGuard, storeHoursGuard],
    loadChildren: () => import('./features/food/food.routes').then(m => m.FOOD_ROUTES)
  },

  // ============================================
  // 5. RUTAS LEGACY (compatibilidad)
  // ============================================
  {
    path: 'catalog',
    redirectTo: 'liquor/catalog',
    pathMatch: 'full'
  },
  {
    path: 'select-cart',
    loadComponent: () => import('./shared/components/empty-cart-selector/empty-cart-selector.component').then(m => m.EmptyCartSelectorComponent)
  },
  {
    path: 'cart',
    redirectTo: 'select-cart',
    pathMatch: 'full'
  },
  {
    path: 'location',
    redirectTo: 'liquor/location',
    pathMatch: 'full'
  },

  // ============================================
  // 6. PÁGINA DE SERVICIO CERRADO
  // ============================================
  {
    path: 'closed',
    loadChildren: () => import('./features/service-status/service-status.routes')
      .then(m => m.SERVICE_STATUS_ROUTES)
  },

  // ============================================
  // 7. CATCH ALL
  // ============================================
  {
    path: '**',
    redirectTo: ''
  }
];
