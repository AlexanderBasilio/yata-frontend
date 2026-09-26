import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../services/auth/auth.service';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor token scope', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), 
    provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    { provide: AuthService, useValue: { getToken: () => 'session' } }
  ] }));

  for (const [url, expected] of [
    [`${environment.platformUrl}/api/v1/service-access`, 'Bearer session'],
    [`${environment.platformUrl}/api/v1/auth/google`, null],
    ['https://accounts.google.com/example', null],
    [`${environment.platformUrl}.example.org/private`, null]
  ]) {
    it(`scopes Authorization for ${url}`, () => {
      TestBed.inject(HttpClient).get(url!).subscribe();
      const http = TestBed.inject(HttpTestingController);
      const request = http.expectOne(url!);
      expect(request.request.headers.get('Authorization')).toBe(expected);
      request.flush({});
      http.verify();
    });
  }
});
