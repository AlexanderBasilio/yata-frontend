import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { HANDLE_ERRORS_LOCALLY } from '../../interceptors/error.interceptor';
import { environment } from '../../../../environments/environment';
import { ReferralApplication, ReferralConfig, ReferralEligibility, ReferralProfile, ReferralValidation } from '../../models/referral.model';

@Injectable({ providedIn: 'root' })
export class ReferralService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.platformUrl}/api/v1/referrals`;
  private readonly storageKey = 'zisify_pending_referral';
  private memoryCode: string | null = null;
  private readonly options = { context: new HttpContext().set(HANDLE_ERRORS_LOCALLY, true) };

  getProfile() { return this.http.get<ReferralProfile>(`${this.url}/me`, this.options); }
  getEligibility() { return this.http.get<ReferralEligibility>(`${this.url}/eligibility`, this.options); }
  getActiveReward() { return this.http.get<ReferralConfig>(`${this.url}/active-reward`, this.options); }
  validate(code: string) { return this.http.get<ReferralValidation>(`${this.url}/validate-code/${encodeURIComponent(code)}`, this.options); }
  apply(code: string) { return this.http.post<ReferralApplication>(`${this.url}/apply-code`, { code }, this.options); }

  remember(code: string) {
    this.memoryCode = code;
    try { sessionStorage.setItem(this.storageKey, code); } catch { /* In-memory fallback. */ }
  }
  pendingCode(): string | null {
    try { return sessionStorage.getItem(this.storageKey) ?? this.memoryCode; } catch { return this.memoryCode; }
  }
  clearPending() {
    this.memoryCode = null;
    try { sessionStorage.removeItem(this.storageKey); } catch { /* Storage unavailable. */ }
  }
}
