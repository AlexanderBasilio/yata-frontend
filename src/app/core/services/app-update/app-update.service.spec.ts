import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AnalyticsService } from '../analytics/analytics.service';
import { CartService } from '../cart/cart.service';
import { AppUpdateService, CONFIRM_APP_RELOAD, RELOAD_APP } from './app-update.service';

describe('AppUpdateService', () => {
  let versions: Subject<VersionEvent>;
  let errors: Subject<{ reason: string }>;
  let routes: Subject<NavigationEnd>;
  let stable: Subject<boolean>;
  let check: jasmine.Spy;
  let reload: jasmine.Spy;
  let confirm: jasmine.Spy;
  let service: AppUpdateService;
  function ready() { versions.next({ type: 'VERSION_READY', currentVersion: { hash: 'old' }, latestVersion: { hash: 'new' } }); }
  function navigate(url: string) { routes.next(new NavigationEnd(1, url, url)); }

  beforeEach(() => {
    versions = new Subject(); errors = new Subject(); routes = new Subject(); stable = new Subject();
    check = jasmine.createSpy('checkForUpdate').and.resolveTo(false);
    reload = jasmine.createSpy('reload'); confirm = jasmine.createSpy('confirm').and.returnValue(true);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: Router, useValue: { url: '/home', events: routes } },
      { provide: SwUpdate, useValue: { isEnabled: true, versionUpdates: versions, unrecoverable: errors, checkForUpdate: check } },
      { provide: AnalyticsService, useValue: { trackUpdate: jasmine.createSpy('trackUpdate') } },
      { provide: RELOAD_APP, useValue: reload }, { provide: CONFIRM_APP_RELOAD, useValue: confirm }
    ] });
    Object.defineProperty(TestBed.inject(ApplicationRef), 'isStable', { value: stable });
    service = TestBed.inject(AppUpdateService); service.initialize();
  });
  afterEach(() => TestBed.resetTestingModule());

  it('waits for VERSION_READY, never reloads automatically', () => {
    versions.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });
    expect(service.visible()).toBeFalse(); ready();
    expect(service.visible()).toBeTrue(); expect(reload).not.toHaveBeenCalled();
  });
  it('checks latest version and reloads only after confirmation', async () => {
    ready(); await service.applyUpdate();
    expect(confirm).toHaveBeenCalledTimes(1); expect(check).toHaveBeenCalledTimes(1); expect(reload).toHaveBeenCalledTimes(1);
  });
  it('does not reload if the user cancels', async () => {
    ready(); confirm.and.returnValue(false); await service.applyUpdate(); expect(reload).not.toHaveBeenCalled();
  });
  it('blocks both cart and checkout routes', async () => {
    ready();
    for (const path of ['/food/cart', '/food/checkout?step=2', '/liquor/cart', '/liquor/location']) {
      navigate(path); await service.applyUpdate(); expect(service.blocked()).toBeTrue();
    }
    expect(reload).not.toHaveBeenCalled();
  });
  it('blocks a payment/dish dialog and releases its hold only once', async () => {
    ready(); const release = service.holdUpdates(); await service.applyUpdate(); expect(reload).not.toHaveBeenCalled();
    release(); release(); expect(service.blocked()).toBeFalse(); await service.applyUpdate(); expect(reload).toHaveBeenCalled();
  });
  it('protects the legacy in-memory cart on every route', async () => {
    TestBed.inject(CartService).addItem({ id: 'test', name: 'Test', price: 1, image: '', unit: '' });
    ready(); await service.applyUpdate(); expect(service.blocked()).toBeTrue(); expect(reload).not.toHaveBeenCalled();
  });
  it('does not reload after a failed check', async () => {
    ready(); check.and.rejectWith(new Error('offline')); await service.applyUpdate();
    expect(reload).not.toHaveBeenCalled(); expect(service.message()).not.toBe('');
  });
  it('recovers the button after a check timeout without reloading', async () => {
    jasmine.clock().install();
    try {
      check.and.returnValue(new Promise<boolean>(() => {}));
      ready(); const applying = service.applyUpdate();
      jasmine.clock().tick(30_001); await applying;
      expect(service.checking()).toBeFalse(); expect(reload).not.toHaveBeenCalled();
      expect(service.message()).not.toBe('');
    } finally { jasmine.clock().uninstall(); }
  });
  it('rechecks a hold added while downloading before it reloads', async () => {
    let resolve!: (value: boolean) => void;
    check.and.returnValue(new Promise<boolean>(done => resolve = done));
    ready(); const applying = service.applyUpdate(); service.holdUpdates(); resolve(true); await applying;
    expect(reload).not.toHaveBeenCalled();
  });
  it('postpones the banner and shows it on the next navigation', () => {
    ready(); service.postpone(); expect(service.visible()).toBeFalse(); navigate('/orders'); expect(service.visible()).toBeTrue();
  });
  it('offers recovery without forcing a reload', () => {
    errors.next({ reason: 'broken resource' }); expect(service.recovery()).toBeTrue(); expect(reload).not.toHaveBeenCalled();
  });
  it('starts checks only after stabilization and throttles subsequent checks', async () => {
    jasmine.clock().install(); jasmine.clock().mockDate(new Date());
    try {
      expect(check).not.toHaveBeenCalled(); stable.next(true); await service.checkForUpdate();
      expect(check).toHaveBeenCalledTimes(1);
      await service.checkForUpdate(); expect(check).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(15 * 60_000); await service.checkForUpdate();
      expect(check).toHaveBeenCalledTimes(2);
      TestBed.resetTestingModule();
    } finally { jasmine.clock().uninstall(); }
  });
});
