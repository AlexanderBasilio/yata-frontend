import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { analyticsPage } from './analytics-events';
import { GA4_SETTINGS, Ga4Transport } from './ga4-transport.service';

describe('AnalyticsService', () => {
  let events: Subject<NavigationEnd>;
  let router: { url: string; navigated: boolean; events: Subject<NavigationEnd> };
  let transport: jasmine.SpyObj<Ga4Transport>;
  let service: AnalyticsService;
  const key = 'zisify_analytics_consent_v1';

  beforeEach(() => {
    localStorage.removeItem(key);
    events = new Subject();
    router = { url: '/zisify', navigated: true, events };
    transport = jasmine.createSpyObj('Ga4Transport', ['enable', 'disable', 'event', 'pageContext']);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: Router, useValue: router }, { provide: Ga4Transport, useValue: transport },
      { provide: GA4_SETTINGS, useValue: { enabled: true, measurementId: 'G-TEST' } }
    ] });
  });
  afterEach(() => { localStorage.removeItem(key); TestBed.resetTestingModule(); });
  function start() { service = TestBed.inject(AnalyticsService); service.initialize(); }
  function navigate(url: string) { router.url = url; router.navigated = true; events.next(new NavigationEnd(1, url, url)); }

  it('sends nothing and does not load GA before consent or after rejection', () => {
    start(); navigate('/home'); service.trackOrderCreated();
    service.setConsent('denied'); navigate('/food/catalog');
    expect(transport.enable).not.toHaveBeenCalled();
    expect(transport.event).not.toHaveBeenCalled();
  });
  it('records the current screen exactly once when consent arrives after navigation', () => {
    start(); service.setConsent('granted'); service.initialize();
    expect(transport.enable).toHaveBeenCalledTimes(1);
    expect(transport.event).toHaveBeenCalledTimes(1);
    expect(transport.event).toHaveBeenCalledWith('page_view', jasmine.objectContaining({ page_path: '/zisify' }));
  });
  it('waits for first NavigationEnd and ignores duplicate events', () => {
    localStorage.setItem(key, 'granted'); router.navigated = false;
    start(); expect(transport.event).not.toHaveBeenCalled();
    navigate('/zisify'); navigate('/zisify');
    expect(transport.event).toHaveBeenCalledTimes(1);
    navigate('/home');
    expect(transport.event).toHaveBeenCalledTimes(2);
    expect(transport.event.calls.mostRecent().args[1]['page_referrer']).toContain('/zisify');
  });
  it('removes query, fragment, matrix parameters and restaurant identifiers', () => {
    expect(analyticsPage('/food/restaurant/private-id;token=secret?phone=999999999#address')).toEqual({
      path: '/food/restaurant/:id', title: 'Detalle de restaurante'
    });
    expect(analyticsPage('/unknown/user@example.com').path).toBe('/unknown');
    start(); service.setConsent('granted');
    navigate('/food/restaurant/private-id?phone=999999999');
    expect(JSON.stringify(transport.event.calls.mostRecent().args)).not.toMatch(/private-id|999999999/);
  });
  it('tracks only allowlisted buttons, once, even with a nested element', () => {
    start(); service.setConsent('granted'); transport.event.calls.reset();
    const button = document.createElement('button');
    button.dataset['analytics'] = 'nav_cart';
    const child = document.createElement('span'); child.textContent = 'Private phone 999999999';
    button.appendChild(child); document.body.appendChild(button);
    child.click();
    expect(transport.event).toHaveBeenCalledTimes(1);
    expect(transport.event).toHaveBeenCalledWith('ui_click', jasmine.objectContaining({ button_id: 'nav_cart' }));
    expect(JSON.stringify(transport.event.calls.allArgs())).not.toContain('999999999');
    button.dataset['analytics'] = 'customer_phone_999999999'; child.click();
    button.remove(); expect(transport.event).toHaveBeenCalledTimes(1);
  });
  it('revokes collection without modifying business storage', () => {
    localStorage.setItem('analytics-test-cart', 'keep');
    start(); service.setConsent('granted'); service.setConsent('denied');
    transport.event.calls.reset(); navigate('/orders'); service.trackPaymentReported();
    expect(transport.disable).toHaveBeenCalled(); expect(transport.event).not.toHaveBeenCalled();
    expect(localStorage.getItem('analytics-test-cart')).toBe('keep');
    localStorage.removeItem('analytics-test-cart');
  });
  it('does not send production analytics from disabled environments', () => {
    TestBed.overrideProvider(GA4_SETTINGS, { useValue: { enabled: false, measurementId: 'G-TEST' } });
    start(); service.setConsent('granted'); navigate('/home'); service.trackOrderCreated();
    expect(transport.enable).not.toHaveBeenCalled(); expect(transport.event).not.toHaveBeenCalled();
  });
  it('uses an items array and does not call a reported payment a purchase', () => {
    start(); service.setConsent('granted'); transport.event.calls.reset();
    service.trackEcommerce('add_to_cart', [{ id: 'dish-1', price: 10, quantity: 2 }]);
    expect(transport.event).toHaveBeenCalledWith('add_to_cart', jasmine.objectContaining({
      currency: 'PEN', value: 20, items: [{ item_id: 'dish-1', price: 10, quantity: 2 }]
    }));
    service.trackOrderCreated(); service.trackPaymentReported();
    expect(transport.event.calls.allArgs().map(args => args[0])).toEqual(['add_to_cart', 'order_created', 'payment_reported']);
  });
  it('does not propagate telemetry failures into business operations', () => {
    start(); transport.event.and.throwError('blocked');
    expect(() => service.setConsent('granted')).not.toThrow();
    expect(() => service.trackOrderCreated()).not.toThrow();
  });
});
