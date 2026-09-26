import { provideZonelessChangeDetection } from '@angular/core';
import { serviceAccessConfig } from './service-access.config';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { isAccessExempt, ServiceAccessService } from './service-access.service';

describe('ServiceAccessService', () => {
  let http: HttpTestingController;
  let service: ServiceAccessService;
  let token: string | null;
  const originalPath = serviceAccessConfig.path;
  const endpoint = `${environment.platformUrl}/api/v1/service-access?ngsw-bypass=true`;

  beforeEach(() => {
    serviceAccessConfig.path = '/api/v1/service-access';
    token = null;
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), 
      provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: AuthService, useValue: { getToken: () => token } }
    ] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ServiceAccessService);
  });

  afterEach(() => { http.verify(); serviceAccessConfig.path = originalPath; });

  for (const state of ['OPEN', 'CLOSED', 'MAINTENANCE']) {
    for (const access of ['PUBLIC', 'DEVELOPER', 'DENIED']) {
      for (const signedIn of [false, true]) {
        it(`${state}/${access}, signed in ${signedIn}: requires a server decision and session for developer`, () => {
          token = signedIn ? 'session' : null;
          let result: boolean | undefined;
          service.check().subscribe(value => result = value);
          const request = http.expectOne(endpoint);
          expect(request.request.params.get('ngsw-bypass')).toBe('true');
          request.flush({ state, access, message: 'Estado', nextOpeningAt: null });
          expect(result).toBe((state === 'OPEN' && access === 'PUBLIC') || (signedIn && access === 'DEVELOPER'));
        });
      }
    }
  }

  it('denies malformed responses rather than falling back to local hours', () => {
    service.check().subscribe(value => expect(value).toBeFalse());
    http.expectOne(endpoint).flush({ state: 'OPEN', access: 'PUBLIC' });
    expect(service.status().state).toBe('UNAVAILABLE');
  });

  it('denies a decision obtained for a previous account', () => {
    token = 'old-session';
    service.check().subscribe(value => expect(value).toBeFalse());
    token = 'new-session';
    http.expectOne(endpoint).flush({ state: 'MAINTENANCE', access: 'DEVELOPER', message: '', nextOpeningAt: null });
  });

  it('denies on transport failure', () => {
    service.check().subscribe(value => expect(value).toBeFalse());
    http.expectOne(endpoint).error(new ProgressEvent('error'));
  });

  it('does not cache developer access across checks', () => {
    token = 'session';
    service.check().subscribe(value => expect(value).toBeTrue());
    http.expectOne(endpoint).flush({ state: 'MAINTENANCE', access: 'DEVELOPER', message: '', nextOpeningAt: null });
    service.check().subscribe(value => expect(value).toBeFalse());
    http.expectOne(endpoint).flush({ state: 'MAINTENANCE', access: 'DENIED', message: '', nextOpeningAt: null });
  });

  it('makes no requests when integration is disabled', () => {
    serviceAccessConfig.path = '';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    TestBed.inject(ServiceAccessService).check().subscribe(value => expect(value).toBeTrue());
    TestBed.inject(HttpTestingController).expectNone(endpoint);
  });

  it('exempts only exact entry points, not similarly prefixed business paths', () => {
    expect(isAccessExempt('/auth/login?next=/home')).toBeTrue();
    expect(isAccessExempt('/closed')).toBeTrue();
    expect(isAccessExempt('/zisify')).toBeTrue();
    expect(isAccessExempt('')).toBeTrue();
    expect(isAccessExempt('/closed-orders')).toBeFalse();
    expect(isAccessExempt('/auth/login/private')).toBeFalse();
    expect(isAccessExempt('/wallet')).toBeFalse();
  });
});
