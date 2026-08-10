import { Component, Input, Output, EventEmitter, inject, signal, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { CustomerService } from '../../../core/services/customer/customer.service';
import { GoogleAuthService } from '../../../core/services/auth/google-auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private customerService = inject(CustomerService);
  private googleAuthService = inject(GoogleAuthService);

  @Input() initialTab: 'login' | 'register' = 'login';
  @Output() close = new EventEmitter<void>();

  @ViewChild('googleBtn', { static: false }) googleBtnRef!: ElementRef<HTMLDivElement>;

  activeTab = signal<'login' | 'register'>('login');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  loginForm!: FormGroup;
  registerForm!: FormGroup;

  ngOnInit(): void {
    this.activeTab.set(this.initialTab);

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone1: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]],
      phone2: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]],
      phone3: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]],
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngAfterViewInit(): void {
    this.initGoogleAuth();
  }

  setTab(tab: 'login' | 'register'): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    setTimeout(() => this.initGoogleAuth(), 100);
  }

  private initGoogleAuth(): void {
    this.googleAuthService.initializeGoogle((idToken: string) => {
      this.handleGoogleAuth(idToken);
    }).then(() => {
      if (this.googleBtnRef?.nativeElement) {
        this.googleAuthService.renderButton(this.googleBtnRef.nativeElement, {
          theme: 'outline',
          size: 'large',
          text: this.activeTab() === 'login' ? 'continue_with' : 'signup_with',
          shape: 'rectangular',
          width: 340
        });
      }
    }).catch((err: any) => {
      console.warn('Google Auth delayed or disabled:', err);
    });
  }

  handleGoogleAuth(idToken: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginWithGoogle(idToken).subscribe({
      next: (res: any) => {
        const userId = res.user?.id || res.userId;
        if (userId) {
          this.customerService.getCustomerProfile(userId).subscribe({
            next: () => {
              this.isLoading.set(false);
              this.closeModal();
              this.router.navigate(['/home']);
            },
            error: () => {
              this.isLoading.set(false);
              this.closeModal();
              this.router.navigate(['/home']);
            }
          });
        } else {
          this.isLoading.set(false);
          this.closeModal();
          this.router.navigate(['/home']);
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        console.error('Google auth error', err);
        this.errorMessage.set(err?.error?.message || 'Error de autenticación con Google.');
      }
    });
  }

  triggerGoogleOneTap(): void {
    this.googleAuthService.promptOneTap();
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        const userId = res.user?.id || res.userId;
        if (userId) {
          this.customerService.getCustomerProfile(userId).subscribe({
            next: () => {
              this.isLoading.set(false);
              this.closeModal();
              this.router.navigate(['/home']);
            },
            error: () => {
              this.isLoading.set(false);
              this.closeModal();
              this.router.navigate(['/home']);
            }
          });
        } else {
          this.isLoading.set(false);
          this.closeModal();
          this.router.navigate(['/home']);
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        console.error('Login error', err);
        if (err.status === 401 || err.status === 403) {
          this.errorMessage.set('Credenciales inválidas. Verifica tu correo y contraseña.');
        } else {
          this.errorMessage.set('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
        }
      }
    });
  }

  onRegisterSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = this.registerForm.value;
    const formattedPhoneNumber = `+51${formData.phone1}${formData.phone2}${formData.phone3}`;

    const createRequest = {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formattedPhoneNumber,
      roles: ['ROLE_CUSTOMER']
    };

    this.authService.register(createRequest).subscribe({
      next: () => {
        this.authService.login({ email: formData.email, password: formData.password }).subscribe({
          next: (res: any) => {
            this.isLoading.set(false);
            this.closeModal();
            this.router.navigate(['/home']);
          },
          error: () => {
            this.isLoading.set(false);
            this.setTab('login');
          }
        });
      },
      error: (err: any) => {
        this.isLoading.set(false);
        console.error('Register error', err);
        this.errorMessage.set('No se pudo crear la cuenta. Intente con otro correo.');
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }
}
