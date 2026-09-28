import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, Event, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { CartService } from '../../../core/services/cart/cart.service';
import { FoodCartService } from '../../../core/services/food-cart/food-cart.service';
import { BottomNavService } from '../../../core/services/bottom-nav/bottom-nav.service';

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
    public bottomNavService = inject(BottomNavService);

    private routeAllowsNav = signal<boolean>(true);

    get showNav(): boolean {
        return this.routeAllowsNav() && !this.bottomNavService.isTemporarilyHidden();
    }

    constructor() {
        this.router.events.subscribe((event: Event) => {
            if (event instanceof NavigationEnd) {
                // Restablecer ocultamiento temporal al cambiar de ruta
                this.bottomNavService.show();

                // Ocultar en auth y en landing pública (usamos urlAfterRedirects para capturar redirecciones de / a /zisify)
                if (event.urlAfterRedirects.split(/[?#]/)[0] === '/closed' || event.urlAfterRedirects.includes('/auth') || event.urlAfterRedirects.includes('/zisify') || event.urlAfterRedirects === '/') {
                    this.routeAllowsNav.set(false);
                } else {
                    // Mostrar solo si está logueado
                    this.routeAllowsNav.set(this.authService.isLoggedIn());
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
