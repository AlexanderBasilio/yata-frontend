import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ReferralsComponent } from './referrals.component';
import { ReferralService } from '../../core/services/referrals/referral.service';

describe('Customer referrals', () => {
  let api: jasmine.SpyObj<ReferralService>;
  const eligibility = { canApplyCode: true, alreadyReferred: false, hasOrders: false, appliedReferralCode: null, reason: null };
  beforeEach(async () => {
    api = jasmine.createSpyObj('ReferralService', ['getProfile', 'getEligibility', 'getActiveReward', 'validate', 'apply', 'pendingCode', 'clearPending']);
    api.getProfile.and.returnValue(of({ referralCode: 'MY-CODE', shareUrl: 'https://zisify.app/r/MY-CODE', isEligible: true, ineligibilityReason: null, totalInvited: 1, totalPending: 1, totalQualified: 0, friends: [{ referredUserId: 'friend', name: 'Ana', status: 'PENDING', joinedAt: '2026-09-16T10:00:00Z', qualifiedAt: null }], activeRewardDescription: 'Premio del backend' }));
    api.getEligibility.and.returnValue(of(eligibility));
    api.getActiveReward.and.returnValue(of({ active: true, rewardDefinitionId: 'reward', rewardDefinitionName: 'Premio', minOrderAmount: 20, referrerMinOrders: 1, requireGoogleAuth: true, updatedAt: null }));
    api.pendingCode.and.returnValue(null);
    api.validate.and.returnValue(of({ valid: true, referrerName: 'Juan', message: 'Código válido' }));
    await TestBed.configureTestingModule({ imports: [ReferralsComponent], providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: ReferralService, useValue: api }] }).compileComponents();
  });
  function create() {
    const fixture = TestBed.createComponent(ReferralsComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('renders backend reward and friendly statuses', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Premio del backend');
    expect(fixture.nativeElement.textContent).toContain('Pendiente');
    expect(fixture.nativeElement.textContent).toContain('Ana');
  });
  it('previews a stored invitation without applying it automatically', () => {
    api.pendingCode.and.returnValue('INVITE');
    const fixture = create();
    fixture.detectChanges();
    expect(api.validate).toHaveBeenCalledWith('INVITE');
    expect(api.apply).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Juan te invitó');
  });
  it('blocks a pending invitation when backend disallows entry', () => {
    api.pendingCode.and.returnValue('INVITE');
    api.getEligibility.and.returnValue(of({ ...eligibility, canApplyCode: false, hasOrders: true, reason: 'Ya realizaste un pedido' }));
    const fixture = create();
    fixture.detectChanges();
    fixture.componentInstance.apply();
    expect(api.validate).not.toHaveBeenCalled();
    expect(api.apply).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ya realizaste un pedido');
  });
  it('requires validation for the exact submitted code', () => {
    const component = create().componentInstance;
    component.changeCode('INVITE');
    component.validate();
    component.changeCode('OTHER');
    component.apply();
    expect(api.apply).not.toHaveBeenCalled();
  });
  it('prevents duplicate submissions and reloads eligibility after success', () => {
    const response = new Subject<any>();
    api.apply.and.returnValue(response);
    const component = create().componentInstance;
    component.changeCode('INVITE'); component.validate(); component.apply(); component.apply();
    expect(api.apply).toHaveBeenCalledTimes(1);
    api.getEligibility.and.returnValue(of({ ...eligibility, canApplyCode: false, alreadyReferred: true, appliedReferralCode: 'INVITE' }));
    response.next({ success: true, referrerName: 'Juan', message: 'Vinculado' }); response.complete();
    expect(component.eligibility()?.alreadyReferred).toBeTrue();
    expect(api.clearPending).toHaveBeenCalled();
    expect(component.feedback()).toBe('Vinculado');
  });
  it('keeps the code and shows business errors without claiming success', () => {
    api.apply.and.returnValue(of({ success: false, referrerName: null, message: 'No puedes usar tu propio código' }));
    const component = create().componentInstance;
    component.changeCode('MY-CODE'); component.validate(); component.apply();
    expect(component.error()).toContain('propio código');
    expect(api.clearPending).not.toHaveBeenCalled();
  });
  it('rechecks eligibility after a failed submission', () => {
    api.apply.and.returnValue(throwError(() => ({ error: { message: 'No disponible' } })));
    const component = create().componentInstance;
    component.changeCode('INVITE'); component.validate();
    api.getEligibility.and.returnValue(of({ ...eligibility, canApplyCode: false, hasOrders: true }));
    component.apply();
    expect(component.eligibility()?.canApplyCode).toBeFalse();
    expect(component.error()).toBe('No disponible');
  });
  it('loads profile even when optional active reward is unavailable', () => {
    api.getActiveReward.and.returnValue(throwError(() => new Error('offline')));
    const component = create().componentInstance;
    expect(component.profile()?.referralCode).toBe('MY-CODE');
    expect(component.error()).toBe('');
  });
});
