import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, Event, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { FoodCartService } from '../../../core/services/food-cart/food-cart.service';
import { OrderService } from '../../../core/services/order/order.service';

@Component({
    selector: 'app-bottom-nav',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './bottom-nav.component.html',
    styleUrl: './bottom-nav.component.scss'
})
export class BottomNavComponent {
    private router = inject(Router);
    public authService = inject(AuthService);
    public cartService = inject(CartService);
    public foodCartService = inject(FoodCartService);
    private orderService = inject(OrderService);

    showNav = true;
    hasPendingPaymentOrder = false;

    constructor() {
        this.router.events.subscribe((event: Event) => {
            if (event instanceof NavigationEnd) {
                // Ocultar en auth y en landing pública (usamos urlAfterRedirects para capturar redirecciones de / a /zisify)
                if (event.urlAfterRedirects.includes('/auth') || event.urlAfterRedirects.includes('/zisify') || event.urlAfterRedirects === '/') {
                    this.showNav = false;
                } else {
                    // Mostrar solo si está logueado
                    this.showNav = this.authService.isLoggedIn();
                    if (this.showNav) {
                        this.checkPendingPaymentOrders();
                    }
                }
            }
        });
    }

    isActive(route: string): boolean {
        return this.router.url.includes(route);
    }

    checkPendingPaymentOrders() {
        this.orderService.getMyOrders().subscribe({
            next: (orders) => {
                this.hasPendingPaymentOrder = orders.some(order => order.status === 'PENDING_PAYMENT');
            },
            error: (err) => {
                console.error('Error checking pending payment orders', err);
            }
        });
    }

    shouldBlinkOrders(): boolean {
        return this.hasPendingPaymentOrder && !this.router.url.includes('/orders');
    }

    getCartRoute(): string {
        if (this.router.url.includes('/food')) {
            return '/food/cart';
        }
        if (this.router.url.includes('/liquor')) {
            return '/liquor/cart';
        }
        return '/select-cart';
    }

    get cartItemCount(): number {
        if (this.router.url.includes('/food')) {
            return this.foodCartService.totalItems();
        }
        if (this.router.url.includes('/liquor')) {
            return this.cartService.itemCount();
        }
        return 0;
    }
}
