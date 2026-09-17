import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ReferralService } from './referral.service';
import { pendingReferralGuard } from '../../guards/pending-referral.guard';
import { environment } from '../../../../environments/environment';

describe('Referral API and onboarding persistence', () => {
  let api: ReferralService;
  let http: HttpTestingController;
  const base = `${environment.platformUrl}/api/v1/referrals`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    api = TestBed.inject(ReferralService);
    http = TestBed.inject(HttpTestingController);
    api.clearPending();
  });
  afterEach(() => { http.verify(); api.clearPending(); });
  it('encodes validation paths and applies the exact code in a POST body', () => {
    api.validate('A/B').subscribe();
    http.expectOne(`${base}/validate-code/A%2FB`).flush({ valid: false });
    api.apply('ZISI-ABC').subscribe();
    const request = http.expectOne(`${base}/apply-code`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'ZISI-ABC' });
    request.flush({ success: true });
  });
  it('reads all three endpoints directly from Platform', () => {
    api.getProfile().subscribe(); api.getEligibility().subscribe(); api.getActiveReward().subscribe();
    for (const path of ['me', 'eligibility', 'active-reward']) http.expectOne(`${base}/${path}`).flush({});
  });
  it('persists across service recreation and redirects Home to the invitation', () => {
    api.remember('ZISI-ABC');
    const recreated = TestBed.runInInjectionContext(() => new ReferralService());
    expect(recreated.pendingCode()).toBe('ZISI-ABC');
    const result = TestBed.runInInjectionContext(() => pendingReferralGuard({} as any, {} as any));
    expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/referrals');
    api.clearPending();
    expect(TestBed.runInInjectionContext(() => pendingReferralGuard({} as any, {} as any))).toBeTrue();
  });
});
