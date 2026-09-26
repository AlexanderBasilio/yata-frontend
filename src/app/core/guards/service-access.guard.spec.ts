import { provideZonelessChangeDetection } from '@angular/core';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { ServiceAccessService } from '../services/store/service-access.service';
import { serviceAccessGuard } from './service-access.guard';

@Component({ template: '' })
class Page {}

describe('global service access routing', () => {
  let allowed: boolean;
  let check: jasmine.Spy;
  beforeEach(() => {
    allowed = true;
    check = jasmine.createSpy().and.callFake(() => of(allowed));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), 
      { provide: ServiceAccessService, useValue: { check } },
      provideRouter([{ path: '', canActivateChild: [serviceAccessGuard], children: [
        { path: 'home', component: Page },
        { path: 'food', children: [{ path: 'catalog', component: Page }, { path: 'cart', component: Page }] },
        { path: 'wallet', component: Page },
        { path: 'closed', component: Page },
        { path: 'auth/login', component: Page }
      ] }])
    ] });
  });

  it('blocks direct entry outside food and liquor', async () => {
    allowed = false;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/wallet');
    expect(TestBed.inject(Router).url).toBe('/closed');
  });

  it('rechecks when navigating between children of an already activated route', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/food/catalog');
    allowed = false;
    await harness.navigateByUrl('/food/cart');
    expect(TestBed.inject(Router).url).toBe('/closed');
    expect(check.calls.count()).toBeGreaterThan(1);
  });

  it('keeps the ordinary login available during maintenance', async () => {
    allowed = false;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/auth/login');
    expect(TestBed.inject(Router).url).toBe('/auth/login');
    expect(check).not.toHaveBeenCalled();
  });
});
