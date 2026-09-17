import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { ReferralService } from '../../core/services/referrals/referral.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main style="padding:48px;color:#FAF8FB;background:#0D0518;min-height:100vh"><h1>Invitación a Zisify</h1><p>{{ message }}</p><a routerLink="/home">Ir al inicio</a></main>`
})
export class ReferralLinkComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private referrals = inject(ReferralService);
  message = 'Preparando tu invitación…';
  ngOnInit() {
    const code = (this.route.snapshot.paramMap.get('code') ?? '').trim();
    if (code.length < 3 || code.length > 32) {
      this.message = 'El código de invitación debe tener entre 3 y 32 caracteres.';
      return;
    }
    this.referrals.remember(code);
    void this.router.navigateByUrl(this.auth.isLoggedIn() ? '/referrals' : '/auth/login', { replaceUrl: true });
  }
}
