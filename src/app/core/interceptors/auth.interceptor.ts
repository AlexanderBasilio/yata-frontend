import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { isBackendUrl } from './api-url';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    if (!isBackendUrl(req.url)) return next(req);
    const authService = inject(AuthService);
    const token = authService.getToken();

    // No agregar el token a rutas de registro o login
    if (['/api/v1/auth/login', '/api/v1/auth/google', '/api/v1/users/register'].includes(new URL(req.url).pathname)) {
        return next(req);
    }

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req);
};
