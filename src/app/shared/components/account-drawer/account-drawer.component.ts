import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';

export interface DrawerMenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: 'profile' | 'orders' | 'notifications' | 'rewards' | 'surveys' | 'coupons' | 'referrals';
  route: string | null;
  badge?: string;
  badgeType?: 'primary' | 'gold' | 'accent' | 'neutral';
}

@Component({
  selector: 'app-account-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account-drawer.component.html',
  styleUrl: './account-drawer.component.scss'
})
export class AccountDrawerComponent {
  private router = inject(Router);
  public authService = inject(AuthService);

  // Inputs
  isOpen = input<boolean>(false);
  customerName = input<string>('');
  currentIdentity = input<string>('');
  zisiCoins = input<number | string>(0);
  totalOrders = input<number | string>(0);
  referrals = input<number | string>('0');
  avatarUrl = input<string>('');

  // Outputs
  closeDrawer = output<void>();

  // Modal para secciones pendientes de backend
  activeModalItem = signal<DrawerMenuItem | null>(null);

  /**
   * Rutas preparadas para el menú lateral.
   * Cuando el backend tenga listas las rutas o páginas, simplemente se asigna el string
   * y el ítem navegará automáticamente a su ruta real.
   */
  readonly menuItems: DrawerMenuItem[] = [
    {
      id: 'profile',
      title: 'Mi perfil',
      subtitle: 'Datos personales y preferencias',
      icon: 'profile',
      route: '/profile' // ✅ Ruta activa
    },
    {
      id: 'orders',
      title: 'Mis pedidos',
      subtitle: 'Historial y estado de tus compras',
      icon: 'orders',
      route: '/orders' // ✅ Ruta activa
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      subtitle: 'Avisos y novedades en tiempo real',
      icon: 'notifications',
      route: null, // ⏳ Listo para ruta real e.g. '/notifications'
      badge: '3',
      badgeType: 'primary'
    },
    {
      id: 'rewards',
      title: 'Recompensas',
      subtitle: 'Tus Z-Coins, nivel y logros',
      icon: 'rewards',
      route: null, // ⏳ Listo para ruta real e.g. '/rewards'
      badge: 'Z-Coins',
      badgeType: 'gold'
    },
    {
      id: 'surveys',
      title: 'Mis encuestas',
      subtitle: 'Opina y gana bonificaciones',
      icon: 'surveys',
      route: null // ⏳ Listo para ruta real e.g. '/surveys'
    },
    {
      id: 'coupons',
      title: 'Mis cupones',
      subtitle: 'Promociones y descuentos vigentes',
      icon: 'coupons',
      route: null, // ⏳ Listo para ruta real e.g. '/coupons'
      badge: '2 activos',
      badgeType: 'primary'
    },
    {
      id: 'referrals',
      title: 'Mis referidos',
      subtitle: 'Comparte tu código y acumula saldo',
      icon: 'referrals',
      route: null, // ⏳ Listo para ruta real e.g. '/referrals'
      badge: 'Nuevo',
      badgeType: 'accent'
    }
  ];

  onClose() {
    this.closeDrawer.emit();
  }

  onItemClick(item: DrawerMenuItem) {
    if (item.route) {
      this.closeDrawer.emit();
      this.router.navigate([item.route]);
    } else {
      // Abre modal informativo con estado "Próximamente"
      this.activeModalItem.set(item);
    }
  }

  closeModal() {
    this.activeModalItem.set(null);
  }

  getDisplayName(): string {
    if (this.customerName()) {
      return this.customerName();
    }
    const user = this.authService.currentUser$.value;
    if (user?.firstName) {
      return `Hola, ${user.firstName}`;
    }
    return 'Hola, Ronald';
  }

  getDisplayAvatar(): string {
    if (this.avatarUrl()) {
      return this.avatarUrl();
    }
    return 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1786573919/avatar-man_uftrhm.png';
  }

  onLogout() {
    this.closeDrawer.emit();
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
