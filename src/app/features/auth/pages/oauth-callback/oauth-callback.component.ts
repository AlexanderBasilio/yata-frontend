// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Router, ActivatedRoute } from '@angular/router';
// import { OAuthService } from '../../../../core/services/auth/oauth.service';

// @Component({
//   selector: 'app-oauth-callback',
//   standalone: true,
//   imports: [CommonModule],
//   template: `
//     <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F456E] to-[#3B5B8A]">
//       <div class="text-center text-white">
//         <div class="inline-flex items-center gap-3 mb-4">
//           <div class="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
//           <span class="text-xl font-semibold">Procesando...</span>
//         </div>
//         <p class="text-sm opacity-80">Estamos validando tu información</p>
//       </div>
//     </div>
//   `
// })
// export class OAuthCallbackComponent implements OnInit {
//   constructor(
//     private route: ActivatedRoute,
//     private router: Router,
//     private oauthService: OAuthService
//   ) {}

//   ngOnInit(): void {
//     // Obtener parámetros de la URL
//     this.route.queryParams.subscribe(params => {
//       const success = params['success'];
//       const flow = this.oauthService.getOAuthFlow();

//       if (success === 'true') {
//         if (flow === 'register') {
//           // Registro: necesita verificar teléfono
//           this.router.navigate(['/auth/landing'], {
//             queryParams: { step: 'phone-verification', source: 'google' }
//           });
//         } else if (flow === 'login') {
//           // Login directo: ir al catálogo
//           this.oauthService.clearOAuthFlow();
//           this.router.navigate(['/catalog']);
//         }
//       } else {
//         // Error en OAuth
//         this.router.navigate(['/auth/landing'], {
//           queryParams: { error: 'oauth_failed' }
//         });
//       }
//     });
//   }
// }
