// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from '../../../../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   private apiUrl = environment.apiUrl;

//   constructor(private http: HttpClient) {}

//   /**
//    * ✅ Registro/Login unificado con Google
//    */
//   registerWithGoogle(googleToken: string, phone: string): Observable<any> {
//     return this.http.post(`${this.apiUrl}/register/google`, {
//       googleToken: googleToken,
//       phone: phone
//     }, {
//       withCredentials: true // ✅ Importante para cookies
//     });
//   }

//   /**
//    * ✅ Login directo con Google (sin teléfono)
//    */
//   loginWithGoogle(googleToken: string): Observable<any> {
//     return this.http.post(`${this.apiUrl}/login/google`, {
//       googleToken: googleToken
//     }, {
//       withCredentials: true
//     });
//   }
// }
