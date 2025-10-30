// import { Component, EventEmitter, Output, ViewChild, signal, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { ModalComponent } from '../../../../shared/components/modal/modal.component';
// import { PhoneInputComponent } from '../phone-input/phone-input.component';
// import { GoogleAuthService } from '../../../../core/services/auth/google-auth.service';

// type ModalStep = 'phone' | 'terms' | 'success';

// @Component({
//   selector: 'app-oauth-flow-modal',
//   standalone: true,
//   imports: [CommonModule, FormsModule, ModalComponent, PhoneInputComponent],
//   templateUrl: './oauth-flow-modal.component.html',
//   styleUrl: './oauth-flow-modal.component.scss'
// })
// export class OAuthFlowModalComponent implements OnInit {
//   @Output() close = new EventEmitter<void>();
//   @Output() registrationComplete = new EventEmitter<void>();

//   @ViewChild(PhoneInputComponent) phoneInput!: PhoneInputComponent;

//   currentStep = signal('phone' as ModalStep);

//   // Datos de Google
//   googleIdToken = '';
//   googleEmail = '';
//   googleName = '';

//   phoneNumber = signal('');
//   termsAccepted = signal(false);

//   isLoading = signal(false);
//   errorMessage = signal('');

//   constructor(private googleAuthService: GoogleAuthService) {}

//   ngOnInit(): void {}

//   setGoogleData(idToken: string, email: string, name: string): void {
//     this.googleIdToken = idToken;
//     this.googleEmail = email;
//     this.googleName = name;
//   }

//   submitPhone(): void {
//     if (!this.phoneInput.isValid()) {
//       this.errorMessage.set('Por favor ingresa un número válido');
//       return;
//     }

//     this.phoneNumber.set(this.phoneInput.getFullPhone());
//     this.errorMessage.set('');
//     this.currentStep.set('terms');
//   }

//   async acceptTerms(): Promise<void> {
//     if (!this.termsAccepted()) {
//       this.errorMessage.set('Debes aceptar los términos');
//       return;
//     }

//     this.isLoading.set(true);

//     try {
//       // TODO: Enviar al backend
//       const registrationData = {
//         idToken: this.googleIdToken,
//         email: this.googleEmail,
//         name: this.googleName,
//         phone: this.phoneNumber()
//       };

//       console.log('📤 Enviando registro:', registrationData);

//       // Simular llamada al backend
//       await this.delay(1500);

//       this.currentStep.set('success');

//       setTimeout(() => {
//         this.registrationComplete.emit();
//       }, 2000);
//     } catch (error) {
//       this.errorMessage.set('Error al completar');
//     } finally {
//       this.isLoading.set(false);
//     }
//   }

//   goBack(): void {
//     if (this.currentStep() === 'terms') {
//       this.currentStep.set('phone');
//     }
//     this.errorMessage.set('');
//   }

//   onClose(): void {
//     this.close.emit();
//   }

//   private delay(ms: number): Promise<void> {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }
// }
