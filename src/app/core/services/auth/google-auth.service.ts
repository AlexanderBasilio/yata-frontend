// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from '../../../../environments/environment';

// declare const google: any;

// @Injectable({
//   providedIn: 'root'
// })
// export class GoogleAuthService {
//   private apiUrl = environment.apiUrl;

//   constructor(private http: HttpClient) {}

//   // Usar el método de POPUP directamente (no FedCM)
//   initGoogleSignIn(callback: (idToken: string, email: string, name: string) => void): void {
//     console.log('🔧 Inicializando Google con Client ID:', environment.google.clientId);

//     const client = google.accounts.oauth2.initTokenClient({
//       client_id: environment.google.clientId,
//       scope: 'openid profile email',
//       callback: (response: any) => {
//         console.log('✅ Token recibido:', response);

//         // Obtener info del usuario con el access_token
//         fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${response.access_token}`)
//           .then(res => res.json())
//           .then(userInfo => {
//             console.log('👤 Info del usuario:', userInfo);
//             callback(response.access_token, userInfo.email, userInfo.name);
//           })
//           .catch(error => console.error('Error obteniendo info:', error));
//       }
//     });

//     // Guardar cliente para usar después
//     (window as any).googleTokenClient = client;
//     console.log('✅ Google token client inicializado');
//   }

//   showGooglePrompt(): void {
//     console.log('🔘 Abriendo popup de Google...');
//     const client = (window as any).googleTokenClient;

//     if (client) {
//       client.requestAccessToken();
//     } else {
//       console.error('❌ Cliente no inicializado');
//     }
//   }

//   completeRegistration(idToken: string, phone: string, otp: string): Observable<any> {
//     return this.http.post(`${this.apiUrl}/register/google/complete`, {
//       idToken,
//       phone,
//       otp
//     }, {
//       withCredentials: true
//     });
//   }
// }
