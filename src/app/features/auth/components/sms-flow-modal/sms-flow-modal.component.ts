import { Component, EventEmitter, Output, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PhoneInputComponent } from '../phone-input/phone-input.component';
import { CodeInputComponent } from '../code-input/code-input.component';

type ModalStep = 'phone' | 'code' | 'userInfo' | 'terms' | 'success';

@Component({
  selector: 'app-sms-flow-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    PhoneInputComponent,
    CodeInputComponent
  ],
  templateUrl: './sms-flow-modal.component.html',
  styleUrl: './sms-flow-modal.component.scss'
})
export class SmsFlowModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() registrationComplete = new EventEmitter<{phone: string, name: string, email?: string}>();

  @ViewChild(PhoneInputComponent) phoneInput!: PhoneInputComponent;
  @ViewChild(CodeInputComponent) codeInput!: CodeInputComponent;

  // Signals - nota: sin tipo en el signal()
  currentStep = signal('phone' as ModalStep);

  phoneNumber = signal('');
  smsCode = signal('');
  userName = signal('');
  userEmail = signal('');
  termsAccepted = signal(false);

  isLoading = signal(false);
  errorMessage = signal('');
  resendTimer = signal(0);
  private resendInterval: any;

  async sendSMS(): Promise<void> {
    if (!this.phoneInput.isValid()) {
      this.errorMessage.set('Por favor ingresa un número válido');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.phoneNumber.set(this.phoneInput.getFullPhone());

    try {
      await this.delay(1500);
      this.currentStep.set('code');
      this.startResendTimer();
    } catch (error) {
      this.errorMessage.set('Error al enviar el código. Intenta nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyCode(code: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.smsCode.set(code);

    try {
      await this.delay(1500);
      this.currentStep.set('userInfo');
    } catch (error) {
      this.errorMessage.set('Código incorrecto. Intenta nuevamente.');
      this.codeInput.clear();
    } finally {
      this.isLoading.set(false);
    }
  }

  submitUserInfo(): void {
    if (!this.userName().trim()) {
      this.errorMessage.set('El nombre es obligatorio');
      return;
    }

    if (this.userName().trim().length < 2) {
      this.errorMessage.set('El nombre debe tener al menos 2 caracteres');
      return;
    }

    this.errorMessage.set('');
    this.currentStep.set('terms');
  }

  acceptTerms(): void {
    if (!this.termsAccepted()) {
      this.errorMessage.set('Debes aceptar los términos y condiciones');
      return;
    }

    this.errorMessage.set('');
    this.completeRegistration();
  }

  async completeRegistration(): Promise<void> {
    this.isLoading.set(true);

    try {
      await this.delay(1500);
      this.currentStep.set('success');

      setTimeout(() => {
        this.registrationComplete.emit({
          phone: this.phoneNumber(),
          name: this.userName(),
          email: this.userEmail() || undefined
        });
      }, 2000);

    } catch (error) {
      this.errorMessage.set('Error al completar el registro');
      this.currentStep.set('userInfo');
    } finally {
      this.isLoading.set(false);
    }
  }

  async resendCode(): Promise<void> {
    if (this.resendTimer() > 0) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.delay(1000);
      this.codeInput.clear();
      this.startResendTimer();
    } catch (error) {
      this.errorMessage.set('Error al reenviar el código');
    } finally {
      this.isLoading.set(false);
    }
  }

  private startResendTimer(): void {
    this.resendTimer.set(60);
    this.resendInterval = setInterval(() => {
      const current = this.resendTimer();
      this.resendTimer.set(current - 1);
      if (this.resendTimer() <= 0) {
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  goBack(): void {
    const current = this.currentStep();
    if (current === 'code') {
      this.currentStep.set('phone');
      clearInterval(this.resendInterval);
    } else if (current === 'userInfo') {
      this.currentStep.set('code');
    } else if (current === 'terms') {
      this.currentStep.set('userInfo');
    }
    this.errorMessage.set('');
  }

  onClose(): void {
    clearInterval(this.resendInterval);
    this.close.emit();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
