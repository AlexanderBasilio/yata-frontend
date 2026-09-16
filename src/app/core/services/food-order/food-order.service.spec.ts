import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FoodOrderService } from './food-order.service';
import { PortalRewardService } from '../portal/portal-reward.service';
import { AuthService } from '../auth/auth.service';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { environment } from '../../../../environments/environment';
import { CheckoutRequest } from '../../models/food-order.model';

describe('Checkout benefit endpoints', () => {
    let http: HttpTestingController;
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
            provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
            { provide: AuthService, useValue: { getToken: () => 'test-jwt' } }
        ] });
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    it('loads benefits directly from Platform with JWT authentication', () => {
        TestBed.inject(PortalRewardService).getAvailableBenefits().subscribe();
        const req = http.expectOne(`${environment.platformUrl}/api/v1/rewards/available-benefits`);
        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Authorization')).toBe('Bearer test-jwt');
        req.flush([]);
    });

    it('releases a reservation through Restaurants', () => {
        TestBed.inject(FoodOrderService).releaseRewardReservation('reservation').subscribe();
        const req = http.expectOne(`${environment.restaurantServiceUrl}/api/orders/checkout/release-reward/reservation`);
        expect(req.request.method).toBe('POST');
        req.flush(null);
    });

    it('creates an order at the supplied checkout endpoint with benefit traceability', () => {
        const body = { rewardId: 'reward', benefitReservationId: 'reservation', checkoutSessionId: 'session' } as CheckoutRequest;
        TestBed.inject(FoodOrderService).confirmOrder(body).subscribe();
        const req = http.expectOne(`${environment.restaurantServiceUrl}/api/orders`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(body);
        req.flush({});
    });
});
