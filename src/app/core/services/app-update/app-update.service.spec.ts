import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
  it('shows the banner if the check confirms a downloaded update even when VERSION_READY was missed', async () => {
    check.and.resolveTo(true); await service.checkForUpdate();
    expect(service.available()).toBeTrue(); expect(service.visible()).toBeTrue();
    expect(reload).not.toHaveBeenCalled();
    ready();
    expect(TestBed.inject(AnalyticsService).trackUpdate).toHaveBeenCalledOnceWith('ready');
  });
  it('does not show an update when the worker reports no new version', async () => {
    await service.checkForUpdate(); expect(service.visible()).toBeFalse();
  });
  it('reloads the already downloaded version after confirmation without another network check', async () => {
    ready(); await service.applyUpdate();
    expect(confirm).toHaveBeenCalledTimes(1); expect(check).not.toHaveBeenCalled(); expect(reload).toHaveBeenCalledTimes(1);
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
  it('does not reload after a failed background check', async () => {
    check.and.rejectWith(new Error('offline')); await service.checkForUpdate();
    expect(reload).not.toHaveBeenCalled(); expect(service.message()).not.toBe('');
  });
  it('recovers the button after a check timeout without reloading', async () => {
    jasmine.clock().install();
    try {
      check.and.returnValue(new Promise<boolean>(() => {}));
      const checking = service.checkForUpdate();
      jasmine.clock().tick(30_001); await checking;
      expect(service.checking()).toBeFalse(); expect(reload).not.toHaveBeenCalled();
      expect(service.message()).not.toBe('');
    } finally { jasmine.clock().uninstall(); }
  });
  it('rechecks a hold added during confirmation before it reloads', async () => {
    confirm.and.callFake(() => { service.holdUpdates(); return true; });
    ready(); await service.applyUpdate();
    expect(reload).not.toHaveBeenCalled();
  });
  it('postpones the banner and shows it on the next navigation', () => {
    ready(); service.postpone(); expect(service.visible()).toBeFalse(); navigate('/orders'); expect(service.visible()).toBeTrue();
  });
  it('offers recovery without forcing a reload', () => {
    errors.next({ reason: 'broken resource' }); expect(service.recovery()).toBeTrue(); expect(reload).not.toHaveBeenCalled();
  });
  it('checks after stabilization and user activity, but never polls on a recurring timer', async () => {
    jasmine.clock().install(); jasmine.clock().mockDate(new Date());
    try {
      expect(check).not.toHaveBeenCalled(); stable.next(true); await service.checkForUpdate();
      expect(check).toHaveBeenCalledTimes(1);
      await service.checkForUpdate(); expect(check).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(15 * 60_000);
      expect(check).toHaveBeenCalledTimes(1);
      navigate('/privacy'); await service.checkForUpdate();
      expect(check).toHaveBeenCalledTimes(2);
      TestBed.resetTestingModule();
    } finally { jasmine.clock().uninstall(); }
  });
  it('checks even if the app has not stabilized after 30 seconds', async () => {
    // Recreate the service while the fake clock is installed so the one-shot timer is controlled.
    TestBed.resetTestingModule();
    jasmine.clock().install();
    try {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
        { provide: Router, useValue: { url: '/privacy', events: routes } },
        { provide: SwUpdate, useValue: { isEnabled: true, versionUpdates: versions, unrecoverable: errors, checkForUpdate: check } },
        { provide: AnalyticsService, useValue: { trackUpdate: jasmine.createSpy() } }
      ] });
      Object.defineProperty(TestBed.inject(ApplicationRef), 'isStable', { value: stable });
      service = TestBed.inject(AppUpdateService); service.initialize();
      jasmine.clock().tick(30_000); await service.checkForUpdate();
      expect(check).toHaveBeenCalledTimes(1);
      TestBed.resetTestingModule();
    } finally { jasmine.clock().uninstall(); }
  });
  it('does not repeatedly check while a fully cached version is waiting for confirmation', async () => {
    ready(); await service.checkForUpdate(); stable.next(true); navigate('/privacy');
    expect(check).not.toHaveBeenCalled();
  });
  it('throttles visibility, pageshow and online events through the same five-minute gate', async () => {
    jasmine.clock().install(); jasmine.clock().mockDate(new Date());
    try {
      const doc = TestBed.inject(DOCUMENT);
      spyOnProperty(doc, 'visibilityState', 'get').and.returnValue('visible');
      stable.next(true); await service.checkForUpdate();
      doc.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      window.dispatchEvent(new Event('online'));
      expect(check).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(5 * 60_000);
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
      expect(check).toHaveBeenCalledTimes(1);
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      await service.checkForUpdate();
      expect(check).toHaveBeenCalledTimes(2);
      TestBed.resetTestingModule();
    } finally { jasmine.clock().uninstall(); }
  });
  it('allows recovery without depending on a response from the broken worker', async () => {
    errors.next({ reason: 'broken resource' }); await service.applyUpdate();
    expect(check).not.toHaveBeenCalled(); expect(reload).toHaveBeenCalledTimes(1);
  });
  it('keeps an unrecoverable page open while offline instead of reloading into a network error', async () => {
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);
    errors.next({ reason: 'broken resource' }); await service.applyUpdate();
    expect(reload).not.toHaveBeenCalled(); expect(service.message()).toContain('conexión');
  });
});
