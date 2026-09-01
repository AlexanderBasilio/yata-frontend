import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics/analytics.service';
import { AppUpdateService } from '../../../core/services/app-update/app-update.service';
import { AppNoticesComponent } from './app-notices.component';

describe('AppNoticesComponent', () => {
  const analytics = { preferencesOpen: signal(true), setConsent: jasmine.createSpy('consent') };
  const updates = {
    visible: signal(true), blocked: signal(false), checking: signal(false), recovery: signal(false),
    message: signal(''), postpone: jasmine.createSpy('postpone'), applyUpdate: jasmine.createSpy('apply')
  };
  beforeEach(() => {
    analytics.preferencesOpen.set(true); analytics.setConsent.calls.reset();
    updates.blocked.set(false); updates.checking.set(false); updates.applyUpdate.calls.reset();
    TestBed.configureTestingModule({ imports: [AppNoticesComponent], providers: [
      provideZonelessChangeDetection(), provideRouter([]),
      { provide: AnalyticsService, useValue: analytics }, { provide: AppUpdateService, useValue: updates }
    ] });
  });
  it('prioritizes cookie choice over the update and has both consent options', async () => {
    const fixture = TestBed.createComponent(AppNoticesComponent); await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2); expect(fixture.nativeElement.textContent).not.toContain('Actualizar ahora');
    buttons[0].click(); expect(analytics.setConsent).toHaveBeenCalledWith('denied');
    buttons[1].click(); expect(analytics.setConsent).toHaveBeenCalledWith('granted');
  });
  it('disables update in critical flows and enables it after leaving them', async () => {
    analytics.preferencesOpen.set(false); updates.blocked.set(true);
    const fixture = TestBed.createComponent(AppNoticesComponent); await fixture.whenStable();
    const button = fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement;
    expect(button.disabled).toBeTrue(); button.click(); expect(updates.applyUpdate).not.toHaveBeenCalled();
    updates.blocked.set(false); await fixture.whenStable();
    expect(button.disabled).toBeFalse(); button.click(); expect(updates.applyUpdate).toHaveBeenCalledTimes(1);
  });
});
