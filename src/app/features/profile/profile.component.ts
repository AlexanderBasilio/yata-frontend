import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, LoyaltyAccount } from '../../core/services/auth/auth.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
    private router = inject(Router);
    public authService = inject(AuthService);

    customerName = 'Usuario Zisify';
    pointsCount = 0;
    level = 'MAKI';

    // Gamification properties
    loyaltyAccount: LoyaltyAccount = {
        walletPoints: 450,
        totalXp: 4500,
        currentLevelCode: 'MAKI',
        activePath: 'NONE'
    };

    selectedGender: 'neutral' | 'chico' | 'chica' = 'neutral';
    
    // Level progress stats
    levelNumber = 5;
    levelName = 'Maki (Principiante)';
    xpMin = 4000;
    xpMax = 5000;
    currentXpInLevel = 500;
    xpProgressPercentage = 50;

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
                this.memberSince = 'Ene 2023';
            }
        });

        // Load gamification account
        const userId = this.authService.getUserId();
        if (userId) {
            this.authService.getLoyaltyAccount(userId).subscribe({
                next: (loyalty) => {
                    if (loyalty) {
                        this.loyaltyAccount = loyalty;
                        this.pointsCount = loyalty.walletPoints;
                        this.calculateLevelStats();
                    }
                },
                error: (err) => {
                    console.warn('⚠️ No se pudo obtener la cuenta de lealtad en tiempo real, usando fallback de simulación:', err);
                    this.calculateLevelStats();
                }
            });
        } else {
            this.calculateLevelStats();
        }
    }

    calculateLevelStats() {
        const xp = this.loyaltyAccount.totalXp;
        // Regla: Cada 1000 XP es un nivel
        this.levelNumber = Math.floor(xp / 1000) + 1;
        this.xpMin = (this.levelNumber - 1) * 1000;
        this.xpMax = this.levelNumber * 1000;
        this.currentXpInLevel = xp - this.xpMin;
        this.xpProgressPercentage = Math.min(100, Math.max(0, (this.currentXpInLevel / 1000) * 100));

        // Mapeo de traducciones y nombres de niveles
        if (this.loyaltyAccount.currentLevelCode === 'MAKI') {
            this.levelName = 'Maki (Principiante)';
            this.level = 'Maki';
        } else {
            this.levelName = this.loyaltyAccount.currentLevelCode;
            this.level = this.loyaltyAccount.currentLevelCode;
        }
        this.pointsCount = this.loyaltyAccount.walletPoints;
    }

    setGender(gender: 'neutral' | 'chico' | 'chica') {
        this.selectedGender = gender;
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}
