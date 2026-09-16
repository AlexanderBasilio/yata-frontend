import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CheckoutComponent } from './checkout.component';
import { FoodOrderService } from '../../../../core/services/food-order/food-order.service';
import { PortalRewardService } from '../../../../core/services/portal/portal-reward.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';
import { OrderSummaryResponse } from '../../../../core/models/food-order.model';

describe('Checkout benefits', () => {
    let component: CheckoutComponent;
    let orders: jasmine.SpyObj<FoodOrderService>;
    const summary: OrderSummaryResponse = {
        validatedSubtotal: 20, deliveryFee: 0, serviceFee: 1, totalAmount: 21,
        rewardId: 'reward-a', benefitReservationId: 'reservation-a'
    };

    beforeEach(() => {
        orders = jasmine.createSpyObj('orders', ['calculateSummary', 'releaseRewardReservation', 'confirmOrder']);
        orders.calculateSummary.and.returnValue(of(summary));
        orders.releaseRewardReservation.and.returnValue(of(undefined));
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
            { provide: FoodOrderService, useValue: orders },
            { provide: PortalRewardService, useValue: { getAvailableBenefits: () => of([]) } },
            { provide: AuthService, useValue: {} },
            { provide: Router, useValue: { navigate: jasmine.createSpy() } },
            { provide: ChangeDetectorRef, useValue: { detectChanges: () => {} } },
            { provide: AnalyticsService, useValue: {
                trackCheckoutStep: () => {}, trackOrderCreated: () => {}, trackError: () => {}
            } }
        ] });
        component = TestBed.runInInjectionContext(() => new CheckoutComponent());
        component.cartId = 'cart';
        component.locationForm.patchValue({ address: 'Calle Lima 123', latitude: -12, longitude: -77 });
    });

    it('sends the selected reward and stable session on summary requests', async () => {
        await component.selectReward('reward-a');
        expect(orders.calculateSummary).toHaveBeenCalledWith(jasmine.objectContaining({
            cartId: 'cart', rewardId: 'reward-a', checkoutSessionId: component.checkoutSessionId
        }));
        await component.calculateSummary();
        expect(orders.calculateSummary.calls.mostRecent().args[0].checkoutSessionId).toBe(component.checkoutSessionId);
    });

    it('waits for release before replacing a reward and prevents concurrent changes', async () => {
        await component.selectReward('reward-a');
        const release = new Subject<void>();
        orders.releaseRewardReservation.and.returnValue(release);
        const change = component.selectReward('reward-b');
        await component.selectReward('reward-c');
        expect(orders.calculateSummary).toHaveBeenCalledTimes(1);
        release.next();
        release.complete();
        await change;
        expect(orders.calculateSummary.calls.mostRecent().args[0].rewardId).toBe('reward-b');
    });

    it('retains the reservation and blocks checkout when release fails', async () => {
        await component.selectReward('reward-a');
        orders.releaseRewardReservation.and.returnValue(throwError(() => new Error('offline')));
        await component.selectReward('reward-b');
        component.confirmOrder();
        expect(component.selectedRewardId).toBe('reward-a');
        expect(component.summaryError).toBeTruthy();
        expect(orders.calculateSummary).toHaveBeenCalledTimes(1);
        expect(orders.confirmOrder).not.toHaveBeenCalled();
    });

    it('removes the reward only after releasing it', async () => {
        await component.selectReward('reward-a');
        orders.calculateSummary.and.returnValue(of({ ...summary, rewardId: null, benefitReservationId: null }));
        await component.selectReward();
        expect(orders.releaseRewardReservation).toHaveBeenCalledWith('reservation-a');
        expect(orders.calculateSummary.calls.mostRecent().args[0].rewardId).toBeUndefined();
        expect(component.orderSummary?.benefitReservationId).toBeNull();
    });

    it('discards stale totals after a failed recalculation', async () => {
        await component.selectReward('reward-a');
        orders.calculateSummary.and.returnValue(throwError(() => new Error('offline')));
        await component.calculateSummary();
        expect(component.orderSummary).toBeNull();
        expect(component.summaryError).toBeTruthy();
    });

    it('releases reservations that arrive after leaving checkout', async () => {
        const pending = new Subject<OrderSummaryResponse>();
        orders.calculateSummary.and.returnValue(pending);
        const calculation = component.selectReward('reward-a');
        await Promise.resolve();
        component.ngOnDestroy();
        pending.next(summary);
        pending.complete();
        await calculation;
        expect(orders.releaseRewardReservation).toHaveBeenCalledWith('reservation-a');
    });

    it('submits backend reward identifiers and does not release a consumed benefit', async () => {
        await component.selectReward('reward-a');
        component.detailsForm.patchValue({ clientName: 'Cliente', clientPhoneNumber: '+51999999999', isOver18: true });
        orders.confirmOrder.and.returnValue(of({ orderId: 'order' } as any));
        component.confirmOrder();
        expect(orders.confirmOrder).toHaveBeenCalledWith(jasmine.objectContaining({
            rewardId: 'reward-a', benefitReservationId: 'reservation-a', checkoutSessionId: component.checkoutSessionId
        }));
        component.ngOnDestroy();
        expect(orders.releaseRewardReservation).not.toHaveBeenCalled();
    });

    it('keeps local first-delivery pricing authoritative when no reservation is returned', async () => {
        orders.calculateSummary.and.returnValue(of({ ...summary, rewardId: null, benefitReservationId: null,
            discountNote: 'Primer envío gratis', appliedDiscounts: [{ type: 'FIRST_DELIVERY', displayName: 'Primer envío', amount: 5 }] }));
        await component.selectReward('reward-a');
        expect(component.orderSummary?.discountNote).toBe('Primer envío gratis');
        component.ngOnDestroy();
        expect(orders.releaseRewardReservation).not.toHaveBeenCalled();
    });
});
