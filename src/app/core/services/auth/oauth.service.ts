// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Router } from '@angular/router';
// import { Observable } from 'rxjs';
// import { environment } from '../../../../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class OAuthService {
//   private apiUrl = environment.apiUrl;

//   constructor(
//     private http: HttpClient,
//     private router: Router
//   ) {}

//   // Iniciar flujo de registro con Google
//   initiateGoogleRegister(): void {
//     // Guardar que estamos en flujo de registro (no login)
//     sessionStorage.setItem('oauth_flow', 'register');

//     // Redirigir al backend que manejará la URL de Google
//     window.location.href = `${this.apiUrl}/register/google/initiate`;
//   }

//   // Iniciar login directo con Google
//   initiateGoogleLogin(): void {
//     sessionStorage.setItem('oauth_flow', 'login');
//     window.location.href = `${this.apiUrl}/login/google`;
//   }

//   // Completar registro después del callback de Google
//   completeGoogleRegister(phone: string, otp: string): Observable<any> {
//     return this.http.post(`${this.apiUrl}/register/google/complete`, {
//       phone,
//       otp
//     }, {
//       withCredentials: true // Importante para httpOnly cookies
//     });
//   }

//   // Obtener tipo de flujo actual
//   getOAuthFlow(): 'register' | 'login' | null {
//     return sessionStorage.getItem('oauth_flow') as 'register' | 'login' | null;
//   }

//   // Limpiar flujo
//   clearOAuthFlow(): void {
//     sessionStorage.removeItem('oauth_flow');
//   }
// }
