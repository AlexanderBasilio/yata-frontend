import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth/auth.service';
import { serviceAccessConfig } from '../services/store/service-access.config';
import { errorInterceptor } from './error.interceptor';

describe('maintenance API rejection', () => {
  const originalPath = serviceAccessConfig.path;
  let logout: jasmine.Spy;
  let navigate: jasmine.Spy;
  beforeEach(() => {
    serviceAccessConfig.path = '/api/v1/service-access';
    logout = jasmine.createSpy();
    navigate = jasmine.createSpy();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), 
      provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { logout } },
      { provide: Router, useValue: { navigateByUrl: navigate } }
    ] });
  });
  afterEach(() => { serviceAccessConfig.path = originalPath; TestBed.inject(HttpTestingController).verify(); });

  for (const code of ['SERVICE_MAINTENANCE', 'SERVICE_CLOSED']) {
    it(`preserves the session on ${code}`, () => {
      const url = `${environment.platformUrl}/api/v1/business`;
      TestBed.inject(HttpClient).get(url).subscribe({ error: () => {} });
      TestBed.inject(HttpTestingController).expectOne(url).flush({ code }, { status: 503, statusText: 'Unavailable' });
      expect(navigate).toHaveBeenCalledWith('/closed');
      expect(logout).not.toHaveBeenCalled();
    });
  }
});
