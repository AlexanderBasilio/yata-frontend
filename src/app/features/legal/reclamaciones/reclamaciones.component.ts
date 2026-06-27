import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-reclamaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reclamaciones.component.html',
  styleUrls: ['./reclamaciones.component.scss']
})
export class ReclamacionesComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  claimForm: FormGroup;
  isSubmitted = false;
  claimCode = '';

  constructor() {
    this.claimForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(5)]],
      documentType: ['DNI', Validators.required],
      documentNumber: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(12)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      address: ['', Validators.required],
      type: ['RECLAMO', Validators.required], // RECLAMO o QUEJA
      description: ['', [Validators.required, Validators.minLength(20)]],
      orderCode: [''],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  submitClaim() {
    if (this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      return;
    }

    // Generate random reference code
    const rand = Math.floor(100000 + Math.random() * 900000);
    this.claimCode = `ZIS-REC-${rand}`;
    this.isSubmitted = true;
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
