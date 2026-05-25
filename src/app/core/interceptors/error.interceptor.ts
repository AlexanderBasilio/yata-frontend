import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 || error.status === 403) {
                // Token expirado o inválido
                console.error('UNAUTHORIZED 401/403:', error);
                authService.logout();
                router.navigate(['/auth/login']);
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
