import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ReferralLinkComponent } from './referral-link.component';
import { ReferralService } from '../../core/services/referrals/referral.service';
import { AuthService } from '../../core/services/auth/auth.service';

describe('Referral deep links', () => {
  for (const loggedIn of [false, true]) {
    it(`captures the invitation before navigating ${loggedIn ? 'to referrals' : 'to login'}`, () => {
      const remember = jasmine.createSpy('remember');
      TestBed.configureTestingModule({ providers: [
        provideZonelessChangeDetection(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ code: 'ZISI-ABC' }) } } },
        { provide: AuthService, useValue: { isLoggedIn: () => loggedIn } },
        { provide: ReferralService, useValue: { remember } }
      ] });
      const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
      const component = TestBed.runInInjectionContext(() => new ReferralLinkComponent());
      component.ngOnInit();
      expect(remember).toHaveBeenCalledWith('ZISI-ABC');
      expect(navigate).toHaveBeenCalledWith(loggedIn ? '/referrals' : '/auth/login', { replaceUrl: true });
    });
  }
});
