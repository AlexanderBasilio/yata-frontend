import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ReferralService } from '../services/referrals/referral.service';

// Login and registration already return to Home after customer onboarding.
export const pendingReferralGuard: CanActivateFn = () => {
  return inject(ReferralService).pendingCode()
    ? inject(Router).parseUrl('/referrals')
    : true;
};
