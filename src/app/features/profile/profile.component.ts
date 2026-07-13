import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, LoyaltyAccountResponse, DeityOption } from '../../core/services/auth/auth.service';

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
    loyaltyAccount: LoyaltyAccountResponse = {
        zisiCoins: 150,
        totalXp: 1250,
        currentLevel: 3,
        identityPath: 'NONE',
        xpRequiredForCurrentLevel: 641,
        xpRequiredForNextLevel: 1300
    };

    selectedGender: 'neutral' | 'chico' | 'chica' = 'neutral';
    
    // Level progress stats
    levelNumber = 3;
    levelName = 'Guardián Maki';
    xpMin = 641;
    xpMax = 1300;
    xpProgressPercentage = 92;

    // Deity properties
    isChoiceAvailable = false;
    choices: DeityOption[] = [];
    unlockedDeities: DeityOption[] = [];

    allDeities: DeityOption[] = [
        { code: 'QINTI', name: "Q'inti (El Picaflor)", description: "Dios de la velocidad y mensajero alado.", benefit: "Envío Express prioritario sin costo adicional.", category: 'PEQUENO', icon: '🐦' },
        { code: 'TUKU', name: "Tuku (El Búho)", description: "Sabiduría y observación nocturna.", benefit: "Multiplicador de Zisicoins en reseñas con foto.", category: 'PEQUENO', icon: '🦉' },
        { code: 'ANU', name: "Añu (El Zorrillo)", description: "Divinidad de la medicina y raíces.", benefit: "Descuentos en Farmacias y Bienestar.", category: 'PEQUENO', icon: '🦨' },
        { code: 'CHASKA', name: "Ch'aska (El Lucero)", description: "Diosa del amanecer y frescura.", benefit: "Promociones exclusivas en Desayunos de 6 a 10 AM.", category: 'PEQUENO', icon: '⭐' },
        { code: 'WAYRA', name: "Wayra (El Viento)", description: "Gobierna ráfagas y corrientes de aire.", benefit: "Reducción fija del 20% en tarifa base de envíos.", category: 'MEDIO', icon: '💨' },
        { code: 'NINA', name: "Nina (El Fuego)", description: "Domina cocción, calor y brasas.", benefit: "Descuentos en Pollerías, Parrillas y Sopas.", category: 'MEDIO', icon: '🔥' },
        { code: 'ALLPA', name: "Allpa (La Tierra)", description: "Protector de cultivos y fertilidad.", benefit: "1.5x Zisicoins en Supermercados.", category: 'MEDIO', icon: '🌱' },
        { code: 'MAMA_KILLA', name: "Mama Killa (La Luna)", description: "Diosa del firmamento nocturno.", benefit: "40% de descuento en envíos desde las 6:00 PM.", category: 'GRANDE', icon: '🌙' },
        { code: 'INTI', name: "Inti (El Sol)", description: "Dios soberano y dador de energía.", benefit: "Descuento del 30% en platos de 11:30 AM a 3:00 PM.", category: 'GRANDE', icon: '☀️' },
        { code: 'ILLAPA', name: "Illapa (El Rayo)", description: "Señor de los cielos y tormentas.", benefit: "Descuentos en sopas y bebidas calientes si llueve.", category: 'GRANDE', icon: '⚡' }
    ];

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

        this.loadUnlockedDeities();
        this.loadLoyaltyStatus();
    }

    loadUnlockedDeities() {
        const stored = localStorage.getItem('zisify_unlocked_deities');
        if (stored) {
            try {
                this.unlockedDeities = JSON.parse(stored);
            } catch (e) {
                this.unlockedDeities = [];
            }
        } else {
            this.unlockedDeities = [];
            localStorage.setItem('zisify_unlocked_deities', JSON.stringify(this.unlockedDeities));
        }
    }

    loadLoyaltyStatus() {
        this.authService.getMyLoyaltyStatus().subscribe({
            next: (loyalty) => {
                if (loyalty) {
                    this.loyaltyAccount = loyalty;
                    this.pointsCount = loyalty.zisiCoins;
                    this.calculateLevelStats();
                    this.checkChoiceAvailability();
                }
            },
            error: (err) => {
                console.warn('⚠️ No se pudo obtener la cuenta de lealtad del backend, usando fallback de simulación:', err);
                this.calculateLevelStats();
                this.checkChoiceAvailability();
            }
        });
    }

    calculateLevelStats() {
        const xp = this.loyaltyAccount.totalXp;
        const currentReq = this.loyaltyAccount.xpRequiredForCurrentLevel;
        const nextReq = this.loyaltyAccount.xpRequiredForNextLevel;

        this.levelNumber = this.loyaltyAccount.currentLevel;
        this.xpMin = currentReq;
        this.xpMax = nextReq;
        this.pointsCount = this.loyaltyAccount.zisiCoins;

        // Visual curve calculation
        const denominator = nextReq - currentReq;
        if (denominator > 0) {
            this.xpProgressPercentage = Math.min(100, Math.max(0, ((xp - currentReq) / denominator) * 100));
        } else {
            this.xpProgressPercentage = 100;
        }

        // Mapping level names dynamically based on identity path
        if (this.loyaltyAccount.identityPath === 'NONE') {
            this.levelName = `Guardián Iniciante (Nv. ${this.levelNumber})`;
        } else {
            const pathLabel = this.loyaltyAccount.identityPath === 'KALLPA' ? 'Kallpa' : 'Sami';
            this.levelName = `Guardián ${pathLabel} (Nv. ${this.levelNumber})`;
        }
    }

    checkChoiceAvailability() {
        this.isChoiceAvailable = false;
        if (this.loyaltyAccount.isChoiceAvailable) {
            this.isChoiceAvailable = true;
            this.choices = this.loyaltyAccount.choices || [];
            return;
        }

        // Simulación RPG para múltiplos de 4: 4, 8, 12, 16, 20, 24
        const lvl = this.levelNumber;
        if (lvl > 0 && lvl % 4 === 0) {
            const hasChosen = localStorage.getItem('zisify_choice_made_level_' + lvl);
            if (!hasChosen) {
                this.isChoiceAvailable = true;
                let cat: 'PEQUENO' | 'MEDIO' | 'GRANDE' = 'PEQUENO';
                if (lvl === 12 || lvl === 20) cat = 'MEDIO';
                if (lvl === 24) cat = 'GRANDE';

                const unlockedCodes = this.unlockedDeities.map(d => d.code);
                const candidates = this.allDeities.filter(d => d.category === cat && !unlockedCodes.includes(d.code));
                
                this.choices = candidates.slice(0, 3);
                if (this.choices.length === 0) {
                    this.choices = this.allDeities.filter(d => d.category === cat).slice(0, 3);
                }
            }
        }
    }

    choosePath(path: 'KALLPA' | 'SAMI') {
        this.authService.chooseGuardianPath(path).subscribe({
            next: () => {
                this.loyaltyAccount.identityPath = path;
                this.calculateLevelStats();
            },
            error: (err) => {
                console.error('Error choosing path:', err);
                this.loyaltyAccount.identityPath = path;
                this.calculateLevelStats();
            }
        });
    }

    selectDeity(deity: DeityOption) {
        this.authService.chooseDeity(deity.code).subscribe({
            next: () => {
                this.saveDeityUnlock(deity);
            },
            error: (err) => {
                console.warn('⚠️ No se pudo guardar la deidad en el servidor, aplicando localmente:', err);
                this.saveDeityUnlock(deity);
            }
        });
    }

    saveDeityUnlock(deity: DeityOption) {
        const unlockedCodes = this.unlockedDeities.map(d => d.code);
        if (!unlockedCodes.includes(deity.code)) {
            this.unlockedDeities.push(deity);
            localStorage.setItem('zisify_unlocked_deities', JSON.stringify(this.unlockedDeities));
        }
        localStorage.setItem('zisify_choice_made_level_' + this.levelNumber, 'true');
        this.isChoiceAvailable = false;
    }

    // Helper method to reset testing status
    resetSimulation() {
        localStorage.removeItem('zisify_unlocked_deities');
        for (let l = 4; l <= 100; l += 4) {
            localStorage.removeItem('zisify_choice_made_level_' + l);
        }
        this.unlockedDeities = [];
        this.checkChoiceAvailability();
    }

    setGender(gender: 'neutral' | 'chico' | 'chica') {
        this.selectedGender = gender;
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}
