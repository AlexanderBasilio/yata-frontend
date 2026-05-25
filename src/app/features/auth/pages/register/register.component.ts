import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './register.component.html',
    styleUrl: './register.component.scss'
})
export class RegisterComponent {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private authService = inject(AuthService);

    registerForm: FormGroup;
    isLoading = false;
    errorMessage = '';

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
            password: ['', [Validators.required, Validators.minLength(8)]]
        });
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
                // Redirigir al login despues de registro exitoso, o hacer login automatico
                this.isLoading = false;
                // Para simplificar, mandamos al login
                this.router.navigate(['/auth/login']);
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Register error', err);
                // Mostrar mensaje de error 
                this.errorMessage = 'No se pudo crear la cuenta. Intente con otro correo.';
            }
        });
    }

    goToLogin() {
        this.router.navigate(['/auth/login']);
    }
}
