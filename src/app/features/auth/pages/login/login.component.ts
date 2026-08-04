import { Component, inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { CustomerService } from '../../../../core/services/customer/customer.service';
import { GoogleAuthService } from '../../../../core/services/auth/google-auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private authService = inject(AuthService);
    private customerService = inject(CustomerService);
    private googleAuthService = inject(GoogleAuthService);

    @ViewChild('googleBtn', { static: false }) googleBtnRef!: ElementRef<HTMLDivElement>;

    loginForm: FormGroup;
    isLoading = false;
    errorMessage = '';
    showPassword = false;

    constructor() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]]
        });

        // Si ya está logueado, redirigir al home (Service Selector)
        if (this.authService.isLoggedIn()) {
            this.router.navigate(['/home']);
        }
    }

    ngAfterViewInit(): void {
        this.initGoogleAuth();
    }

    private initGoogleAuth(): void {
        this.googleAuthService.initializeGoogle((idToken) => {
            this.handleGoogleLogin(idToken);
        }).then(() => {
            if (this.googleBtnRef?.nativeElement) {
                this.googleAuthService.renderButton(this.googleBtnRef.nativeElement, {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    width: 360
                });
            }
        }).catch(err => {
            console.warn('Google Auth initialization delayed or disabled:', err);
        });
    }

    handleGoogleLogin(idToken: string): void {
        this.isLoading = true;
        this.errorMessage = '';

        this.authService.loginWithGoogle(idToken).subscribe({
            next: (res) => {
                const userId = res.user?.id || res.userId;
                if (userId) {
                    this.customerService.getCustomerProfile(userId).subscribe({
                        next: () => {
                            this.isLoading = false;
                            this.router.navigate(['/home']);
                        },
                        error: (errCustomer) => {
                            console.error('Customer profile fetch failed', errCustomer);
                            this.isLoading = false;
                            this.router.navigate(['/home']);
                        }
                    });
                } else {
                    this.isLoading = false;
                    this.router.navigate(['/home']);
                }
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Google login error', err);
                if (err.status === 401 || err.status === 403) {
                    this.errorMessage = err.error?.message || 'Error de autenticación con Google. Intenta nuevamente.';
                } else {
                    this.errorMessage = 'No se pudo iniciar sesión con Google. Intenta más tarde.';
                }
            }
        });
    }

    triggerGoogleOneTap(): void {
        this.googleAuthService.promptOneTap();
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const credentials = this.loginForm.value;

        this.authService.login(credentials).subscribe({
            next: (res) => {
                const userId = res.user?.id || res.userId;
                if (userId) {
                    this.customerService.getCustomerProfile(userId).subscribe({
                        next: () => {
                            this.isLoading = false;
                            this.router.navigate(['/home']);
                        },
                        error: (errCustomer) => {
                            console.error('Customer profile fetch failed', errCustomer);
                            this.isLoading = false;
                            this.router.navigate(['/home']);
                        }
                    });
                } else {
                    this.isLoading = false;
                    this.router.navigate(['/home']);
                }
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Login error', err);
                if (err.status === 403 || err.status === 401) {
                    this.errorMessage = 'Credenciales inválidas. Verifica tu correo y contraseña.';
                } else {
                    this.errorMessage = 'Ocurrió un error al intentar iniciar sesión. Intenta más tarde.';
                }
            }
        });
    }

    goToRegister() {
        this.router.navigate(['/auth/register']);
    }
}
