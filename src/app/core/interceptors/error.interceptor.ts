import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { serviceAccessConfig } from '../services/store/service-access.config';
import { isBackendUrl } from './api-url';

export const HANDLE_ERRORS_LOCALLY = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (serviceAccessConfig.path && isBackendUrl(req.url) && error.status === 503 &&
                ['SERVICE_MAINTENANCE', 'SERVICE_CLOSED'].includes(error.error?.code)) {
                void router.navigateByUrl('/closed');
                return throwError(() => error);
            }

            // Si el servicio solicitó manejar sus errores localmente, no interceptar
            if (req.context.get(HANDLE_ERRORS_LOCALLY)) {
                return throwError(() => error);
            }

            if (error.status === 401 || error.status === 403) {
                // Solo cerrar sesión y redirigir si el usuario realmente estaba autenticado
                // y no se encuentra ya en rutas públicas o de autenticación
                const currentUrl = router.url || '';
                const isPublicOrAuth = currentUrl.includes('/auth') || currentUrl.includes('/zisify') || currentUrl === '' || currentUrl === '/';

                if (authService.isLoggedIn() && !isPublicOrAuth) {
                    console.error('UNAUTHORIZED 401/403: Sesión expirada o no autorizada', error);
                    authService.logout();
                    router.navigate(['/auth/login']);
                }
                return throwError(() => error);
            }
            // Manejar errores de servidor o de red
            else if (error.status === 500 || error.status === 0) {
                console.error('SERVER ERROR 500 or 0:', error);
                alert('Hubo un error en el servidor o se perdió la conexión. Por favor intenta de nuevo más tarde.');
            }
            return throwError(() => error);
        })
    );
};
