import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { isAccessExempt, ServiceAccessService } from '../services/store/service-access.service';

export const serviceAccessGuard: CanActivateChildFn = (_route, state) => {
  const access = inject(ServiceAccessService);
  const router = inject(Router);
  if (isAccessExempt(state.url)) return true;
  return access.check().pipe(map(allowed => allowed ? true : router.parseUrl('/closed')));
};
