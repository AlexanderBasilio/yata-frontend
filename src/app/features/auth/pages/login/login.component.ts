import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { CustomerService } from '../../../../core/services/customer/customer.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private authService = inject(AuthService);
    private customerService = inject(CustomerService);

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
                // Obtenemos el perfil de Customer para la app Zisify antes de redirigir
                this.customerService.getCustomerProfile(res.userId).subscribe({
                    next: () => {
                        this.isLoading = false;
                        this.router.navigate(['/home']);
                    },
                    error: (errCustomer) => {
                        console.error('Customer profile fetch failed', errCustomer);
                        // Sigue siendo exitoso el login, pero no devolvió cliente (quizas no configuro)
                        this.isLoading = false;
                        this.router.navigate(['/home']);
                    }
                });
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
