import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { ReferralService } from '../../core/services/referrals/referral.service';
import { ReferralConfig, ReferralEligibility, ReferralProfile, ReferralStatus, ReferralValidation } from '../../core/models/referral.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './referrals.component.html',
  styleUrl: './referrals.component.scss'
})
export class ReferralsComponent implements OnInit {
  private api = inject(ReferralService);
  private destroyRef = inject(DestroyRef);
  profile = signal<ReferralProfile | null>(null);
  eligibility = signal<ReferralEligibility | null>(null);
  reward = signal<ReferralConfig | null>(null);
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  feedback = signal('');
  formOpen = signal(false);
  validation = signal<ReferralValidation | null>(null);
  code = '';
  private validatedCode = '';
  readonly labels: Record<ReferralStatus, string> = {
    PENDING: 'Pendiente', QUALIFIED: '¡Completado!', CANCELLED: 'Cancelado', EXPIRED: 'Expirado'
  };

  ngOnInit() {
    this.code = this.api.pendingCode() ?? '';
    this.formOpen.set(!!this.code);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.eligibility.set(null);
    forkJoin({
      profile: this.api.getProfile(),
      eligibility: this.api.getEligibility(),
      reward: this.api.getActiveReward().pipe(catchError(() => of(null)))
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: ({ profile, eligibility, reward }) => {
        this.profile.set(profile);
        this.eligibility.set(eligibility);
        this.reward.set(reward);
        if (!eligibility.canApplyCode) {
          this.formOpen.set(false);
          this.api.clearPending();
        } else if (this.code && this.formOpen()) {
          this.validate();
        }
      },
      error: err => this.error.set(this.message(err, 'No pudimos cargar tus referidos. Inténtalo nuevamente.'))
    });
  }

  changeCode(value: string) {
    this.code = value;
    this.validation.set(null);
    this.validatedCode = '';
    this.error.set('');
  }

  validate() {
    if (this.busy() || !this.eligibility()?.canApplyCode) return;
    const code = this.code.trim();
    if (code.length < 3 || code.length > 32) {
      this.error.set('El código debe tener entre 3 y 32 caracteres.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.validation.set(null);
    this.api.validate(code).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: result => {
        if (this.code.trim() !== code) return;
        this.validatedCode = code;
        this.validation.set(result);
      },
      error: err => this.error.set(this.message(err, 'No pudimos validar el código. Inténtalo nuevamente.'))
    });
  }

  apply() {
    if (this.busy() || !this.eligibility()?.canApplyCode || !this.validation()?.valid || this.validatedCode !== this.code.trim()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.apply(this.validatedCode).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: result => {
        if (!result.success) { this.error.set(result.message); return; }
        this.feedback.set(result.message || `Invitación aplicada${result.referrerName ? ' de ' + result.referrerName : ''}.`);
        this.api.clearPending();
        this.formOpen.set(false);
        this.validation.set(null);
        this.code = '';
        this.load();
      },
      error: err => {
        this.error.set(this.message(err, 'No pudimos aplicar el código. Inténtalo nuevamente.'));
        // Refresh authoritative eligibility after a possible order/race or lost response.
        this.eligibility.set(null);
        this.api.getEligibility().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: value => {
            this.eligibility.set(value);
            if (!value.canApplyCode) { this.formOpen.set(false); this.api.clearPending(); }
          },
          error: () => { /* Keep entry disabled until the user reloads. */ }
        });
      }
    });
  }

  dismiss() { this.formOpen.set(false); this.api.clearPending(); this.validation.set(null); this.code = ''; }

  async copy(value: string | null | undefined) {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); this.feedback.set('Copiado al portapapeles.'); }
    catch { this.error.set('No pudimos copiar. Selecciona y copia el código o enlace que aparece en pantalla.'); }
  }

  async share() {
    const url = this.profile()?.shareUrl;
    if (!url) return;
    if (!navigator.share) { await this.copy(url); return; }
    try { await navigator.share({ title: 'Te invito a Zisify', text: '¡Únete a Zisify con mi invitación!', url }); }
    catch (err) { if ((err as Error)?.name !== 'AbortError') await this.copy(url); }
  }

  private message(err: any, fallback: string): string {
    return typeof err?.error?.message === 'string' ? err.error.message : fallback;
  }
}
