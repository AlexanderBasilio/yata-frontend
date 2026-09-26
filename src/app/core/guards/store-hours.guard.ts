import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreHoursService } from '../services/store/store-hours.service';
import { ServiceAccessService } from '../services/store/service-access.service';

export const storeHoursGuard: CanActivateFn = (route, state) => {
  // The global guard becomes the sole authority after backend integration.
  if (inject(ServiceAccessService).enabled) return true;
  const router = inject(Router);
  const storeHoursService = inject(StoreHoursService);

  const isOpen = storeHoursService.isOpen();
  const currentUrl = state.url;
  const currentTime = storeHoursService.getCurrentTimeInPeru();
  const hours = storeHoursService.getStoreHours();

  console.log('🕐 Hora actual en Perú:', currentTime);
  console.log('🏪 Horario tienda:', hours);
  console.log('✅ Tienda abierta:', isOpen);
  console.log('📍 URL actual:', currentUrl);

  // Si la tienda está CERRADA y NO está en /closed
  if (!isOpen && !currentUrl.startsWith('/closed')) {
    console.log('❌ Tienda cerrada - Redirigiendo a /closed');
    router.navigate(['/closed']);
    return false;
  }

  // Si la tienda está ABIERTA y está en /closed
  if (isOpen && currentUrl.startsWith('/closed')) {
    console.log('✅ Tienda abierta - Redirigiendo a /liquor/catalog');
    router.navigate(['/liquor/catalog']);
    return false;
  }

  // Permitir acceso
  console.log('✅ Acceso permitido a:', currentUrl);
  return true;
};
