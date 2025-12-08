import { Routes } from '@angular/router';
import { storeHoursGuard } from './core/guards/store-hours.guard';

export const routes: Routes = [
  // ============================================
  // 1. SERVICE SELECTOR - RAÍZ
  // ============================================
  {
    path: '',
    loadComponent: () => import('./features/service-selector/service-selector.component')
      .then(m => m.ServiceSelectorComponent)
  },

  // ============================================
  // 2. AUTH (para implementar después)
  // ============================================
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  // ============================================
  // 3. SERVICIO DE LICORES
  // ============================================
  {
    path: 'liquor',
    canActivate: [storeHoursGuard],
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
  // 4. SERVICIO DE COMIDA
  // ============================================
  {
    path: 'food',
    canActivate: [storeHoursGuard],
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
    path: 'cart',
    redirectTo: 'liquor/cart',
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
