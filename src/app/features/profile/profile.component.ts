import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
    private router = inject(Router);
    public authService = inject(AuthService);

    customerName = 'Usuario Zisify';
    pointsCount = 0;
    level = 'Hatun Runa';

    // Activity Stats
    totalOrders = 87;
    monthlySpending = 2340;
    averageRating = 4.8;
    favoriteDishesCount = 3;
    favoriteDishName = 'Pollo a la brasa';
    memberSince = 'Ene 2023';

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            if (user && user.firstName) {
                this.customerName = user.firstName + (user.lastName ? ' ' + user.lastName : '');
                this.memberSince = 'Ene 2023'; // Default fallback until real date is provided
            }
        });
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}
