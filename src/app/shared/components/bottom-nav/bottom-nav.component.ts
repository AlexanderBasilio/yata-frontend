import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, Event, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { FoodCartService } from '../../../core/services/food-cart/food-cart.service';

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

    showNav = true;

    constructor() {
        this.router.events.subscribe((event: Event) => {
            if (event instanceof NavigationEnd) {
                // Ocultar en auth y en landing pública (usamos urlAfterRedirects para capturar redirecciones de / a /zisify)
                if (event.urlAfterRedirects.includes('/auth') || event.urlAfterRedirects.includes('/zisify') || event.urlAfterRedirects === '/') {
                    this.showNav = false;
                } else {
                    // Mostrar solo si está logueado
                    this.showNav = this.authService.isLoggedIn();
                }
            }
        });
    }

    isActive(route: string): boolean {
        return this.router.url.includes(route);
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
