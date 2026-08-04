import { Component, inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { CustomerService } from '../../../../core/services/customer/customer.service';
import { GoogleAuthService } from '../../../../core/services/auth/google-auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './register.component.html',
    styleUrl: './register.component.scss'
})
export class RegisterComponent implements AfterViewInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private authService = inject(AuthService);
    private customerService = inject(CustomerService);
    private googleAuthService = inject(GoogleAuthService);

    @ViewChild('googleBtn', { static: false }) googleBtnRef!: ElementRef<HTMLDivElement>;

    registerForm: FormGroup;
    isLoading = false;
    errorMessage = '';
    showPassword = false;
    showConfirmPassword = false;

    constructor() {
        this.registerForm = this.fb.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            // Tres cajas separadas de max 3
            phone1: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]],
            phone2: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]],
            phone3: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]],
            // Exigencia de extensión .com o dos caracteres
            email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
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
                    text: 'signup_with',
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
                console.error('Google register/login error', err);
                if (err.status === 401 || err.status === 403) {
                    this.errorMessage = err.error?.message || 'Error de autenticación con Google. Intenta nuevamente.';
                } else {
                    this.errorMessage = 'No se pudo completar el registro con Google. Intenta más tarde.';
                }
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

    onSubmit() {
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const formData = this.registerForm.value;

        // Concatenar el celular con el +51 estático de Perú y borrar temp
        const formattedPhoneNumber = `+51${formData.phone1}${formData.phone2}${formData.phone3}`;

        // Preparar el DTO para el backend
        const createRequest = {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formattedPhoneNumber,
            roles: ["ROLE_CUSTOMER"] // Siempre registramos como ROLE_CUSTOMER desde Zisify App
        };

        this.authService.register(createRequest).subscribe({
            next: (res) => {
                this.isLoading = false;
                this.router.navigate(['/auth/login']);
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Register error', err);
                this.errorMessage = 'No se pudo crear la cuenta. Intente con otro correo.';
            }
        });
    }

    goToLogin() {
        this.router.navigate(['/auth/login']);
    }
}
