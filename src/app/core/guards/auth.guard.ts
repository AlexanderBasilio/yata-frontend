import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn()) {
        return true;
    }

    // Si no está auth, lo mandamos al login guardando a dónde iba opcionalmente.
    // Por ahora lo mandamos directo al login.
    return router.parseUrl('/auth/login');
};
