import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, LoyaltyAccountResponse, DeityOption } from '../../core/services/auth/auth.service';
import { 
    CustomerAnalyticsService, 
    CustomerProfileStatsResponse, 
    MonthlyOrdersResponse, 
    CustomerPersonalInfoResponse, 
    CustomerAddressDto, 
    AddressRequest 
} from '../../core/services/customer/customer-analytics.service';
import { MapboxService } from '../../core/services/location/mapbox.service';
import mapboxgl from 'mapbox-gl';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    public authService = inject(AuthService);
    public analyticsService = inject(CustomerAnalyticsService);
    private mapboxService = inject(MapboxService);

    readonly womenAvatarUrl = 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1786573894/Gemini_Generated_Image_alg3v6alg3v6alg3_lpa0lo.png';
    readonly menAvatarUrl = 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1786573919/avatar-man_uftrhm.png';

    customerName = 'Usuario Zisify';
    pointsCount = 0;
    level = 'MAKI';

    // Personal Info & Addresses Signals
    personalInfo = signal<CustomerPersonalInfoResponse | null>(null);
    contactInfo = computed(() => this.personalInfo()?.contactInfo || null);
    addresses = computed(() => this.personalInfo()?.addresses || []);

    // Address Modal & Mapbox signals
    showAddAddressModal = signal(false);
    editingAddressId = signal<number | null>(null);
    newLabel = signal('Casa');
    newStreetAddress = signal('');
    newReference = signal('');
    newCity = signal('MIRAFLORES');
    newLatitude = signal(-12.1211);
    newLongitude = signal(-77.0298);
    newIsDefault = signal(false);
    isSavingAddress = signal(false);

    private map?: mapboxgl.Map;
    private marker?: mapboxgl.Marker;

    // Analytics Signals
    profileStats = signal<CustomerProfileStatsResponse | null>(null);
    monthlyOrders = signal<MonthlyOrdersResponse[]>([]);
    activeDishIndex = signal<number>(0);

    // Dynamic computations for charts & carousel
    maxMonthlyOrders = computed(() => {
        const orders = this.monthlyOrders();
        if (!orders || orders.length === 0) return 1;
        const max = Math.max(...orders.map(o => o.orders || 0));
        return max > 0 ? max : 1;
    });

    totalMonthlyOrdersCount = computed(() => {
        const orders = this.monthlyOrders();
        if (!orders || orders.length === 0) return 0;
        return orders.reduce((sum, item) => sum + (item.orders || 0), 0);
    });

    favoriteDishesList = computed(() => {
        const stats = this.profileStats();
        if (stats && stats.favoriteDishes && stats.favoriteDishes.length > 0) {
            return stats.favoriteDishes;
        }
        return [
            { name: 'Chaufa de Cerdo', ordersCount: 1 }
        ];
    });

    currentFavoriteDish = computed(() => {
        const list = this.favoriteDishesList();
        if (!list || list.length === 0) return null;
        const index = Math.abs(this.activeDishIndex()) % list.length;
        return list[index];
    });

    favoriteCategoriesList = computed(() => {
        const stats = this.profileStats();
        if (stats && stats.favoriteCategories && stats.favoriteCategories.length > 0) {
            return stats.favoriteCategories;
        }
        return [
            { category: 'Chifa y Fusión', percentage: 100 }
        ];
    });

    conicGradientStyle = computed(() => {
        const list = this.favoriteCategoriesList();
        const colors = ['#C30364', '#8B5CF6', '#F59E0B', '#06B6D4', '#64748B'];
        let currentPct = 0;
        const stops: string[] = [];

        list.forEach((cat, idx) => {
            const nextPct = Math.min(100, currentPct + cat.percentage);
            const color = colors[idx % colors.length];
            stops.push(`${color} ${currentPct.toFixed(1)}% ${nextPct.toFixed(1)}%`);
            currentPct = nextPct;
        });

        if (currentPct < 100) {
            stops.push(`#31204F ${currentPct.toFixed(1)}% 100%`);
        }

        return `background: conic-gradient(${stops.join(', ')})`;
    });

    // Computeds para Nombre y Datos Personales
    fullName = computed(() => {
        const contact = this.contactInfo();
        if (contact?.firstName && contact?.lastName) {
            return `${contact.firstName} ${contact.lastName}`.trim();
        }
        if (contact?.firstName) return contact.firstName;
        const user = this.authService.currentUser$.value;
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`.trim();
        }
        if (user?.firstName) return user.firstName;
        return this.customerName || 'Alexander Basilio';
    });

    // Gamification Signal & Properties
    loyaltyAccount = signal<LoyaltyAccountResponse>({
        zisiCoins: 0,
        totalXp: 320,
        currentLevel: 6,
        identityPath: 'KALLPA',
        xpRequiredToReachCurrentLevel: 0,
        xpRequiredToReachNextLevel: 1200,
        xpEarnedInCurrentLevel: 320,
        xpNeededForNextLevel: 1200,
        progressPercentage: 27,
        xpRequiredForCurrentLevel: 0,
        xpRequiredForNextLevel: 1200
    });

    // Modal de Confirmación de Camino
    showPathConfirmModal = signal(false);
    pendingPath = signal<'KALLPA' | 'SAMI' | null>(null);

    // Computeds Dinámicos de Nivel y Experiencia (Usa directamente los datos provistos por Backend)
    currentLevel = computed(() => this.loyaltyAccount().currentLevel || 6);
    nextLevel = computed(() => this.currentLevel() + 1);

    xpMin = computed(() => {
        const acc = this.loyaltyAccount();
        return acc.xpRequiredToReachCurrentLevel ?? acc.xpRequiredForCurrentLevel ?? 0;
    });

    xpMax = computed(() => {
        const acc = this.loyaltyAccount();
        return acc.xpRequiredToReachNextLevel ?? acc.xpRequiredForNextLevel ?? 1200;
    });

    currentXpInLevel = computed(() => {
        const acc = this.loyaltyAccount();
        if (acc.xpEarnedInCurrentLevel != null) {
            return acc.xpEarnedInCurrentLevel;
        }
        const totalXp = acc.totalXp || 320;
        return Math.max(0, totalXp - this.xpMin());
    });

    xpToNextLevelInLevel = computed(() => {
        const acc = this.loyaltyAccount();
        if (acc.xpNeededForNextLevel != null) {
            return acc.xpNeededForNextLevel;
        }
        return Math.max(1, this.xpMax() - this.xpMin());
    });

    progressPercentage = computed(() => {
        const acc = this.loyaltyAccount();
        if (acc.progressPercentage != null) {
            return Math.min(100, Math.max(0, Math.round(acc.progressPercentage)));
        }
        const curr = this.currentXpInLevel();
        const total = this.xpToNextLevelInLevel();
        return Math.min(100, Math.max(0, Math.round((curr / total) * 100)));
    });

    selectedGender: 'neutral' | 'chico' | 'chica' = 'neutral';
    
    // Level progress stats (legacy / fallback)
    levelNumber = 6;
    levelName = 'Guardián Kallpa (Nv. 6)';
    xpProgressPercentage = 27;

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

    // Activity Stats (Fallbacks)
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
        this.loadAnalyticsData();
        this.loadPersonalInfo();
    }

    ngOnDestroy() {
        this.cleanupMap();
    }

    loadPersonalInfo() {
        this.analyticsService.getPersonalInfo().subscribe({
            next: (info) => {
                if (info) {
                    this.personalInfo.set(info);
                }
            }
        });
    }

    loadAnalyticsData() {
        this.analyticsService.getProfileStats().subscribe({
            next: (stats) => {
                if (stats) {
                    this.profileStats.set(stats);
                }
            }
        });

        this.analyticsService.getMonthlyOrders(6).subscribe({
            next: (orders) => {
                if (orders && orders.length > 0) {
                    this.monthlyOrders.set(orders);
                }
            }
        });
    }

    // Modal & Address Management Methods
    openAddAddressModal() {
        this.editingAddressId.set(null);
        this.newLabel.set('Casa');
        this.newStreetAddress.set('');
        this.newReference.set('');
        this.newCity.set('MIRAFLORES');
        this.newIsDefault.set(this.addresses().length === 0);
        this.showAddAddressModal.set(true);

        setTimeout(() => {
            this.initMap(-12.1211, -77.0298);
        }, 150);
    }

    openEditAddressModal(address: CustomerAddressDto) {
        this.editingAddressId.set(address.id || null);
        this.newLabel.set(address.label || 'Casa');
        this.newStreetAddress.set(address.streetAddress || '');
        this.newReference.set(address.reference || '');
        this.newCity.set(address.city || 'MIRAFLORES');
        this.newIsDefault.set(address.isDefault || false);
        this.showAddAddressModal.set(true);

        const lat = address.latitude || -12.1211;
        const lng = address.longitude || -77.0298;

        setTimeout(() => {
            this.initMap(lat, lng);
        }, 150);
    }

    closeAddAddressModal() {
        this.showAddAddressModal.set(false);
        this.editingAddressId.set(null);
        this.cleanupMap();
    }

    deleteAddress(address: CustomerAddressDto) {
        if (!address.id) return;
        const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar la dirección "${address.label}"?`);
        if (!confirmDelete) return;

        this.analyticsService.deleteAddress(address.id).subscribe({
            next: () => {
                this.loadPersonalInfo();
            },
            error: (err) => {
                console.error('Error eliminando dirección:', err);
                // Si falla en backend, actualizar el estado local
                const current = this.personalInfo();
                if (current) {
                    this.personalInfo.set({
                        ...current,
                        addresses: current.addresses.filter(a => a.id !== address.id)
                    });
                }
            }
        });
    }

    saveAddress() {
        if (!this.newStreetAddress().trim()) {
            alert('Por favor ingresa la dirección de entrega.');
            return;
        }

        this.isSavingAddress.set(true);

        const payload: AddressRequest = {
            label: this.newLabel(),
            streetAddress: this.newStreetAddress(),
            reference: this.newReference(),
            city: this.newCity(),
            latitude: this.newLatitude(),
            longitude: this.newLongitude(),
            isDefault: this.newIsDefault(),
            zoneId: `zone-${this.newCity().toLowerCase().replace(/\s+/g, '-')}`
        };

        const editId = this.editingAddressId();
        const request$ = editId 
            ? this.analyticsService.updateAddress(editId, payload)
            : this.analyticsService.addAddress(payload);

        request$.subscribe({
            next: () => {
                this.isSavingAddress.set(false);
                this.closeAddAddressModal();
                this.loadPersonalInfo();
            },
            error: (err) => {
                console.warn('⚠️ Guardado en portal con fallback local:', err);
                this.isSavingAddress.set(false);
                // Fallback reactivo local
                const current = this.personalInfo();
                if (current) {
                    let updatedAddresses = [...current.addresses];
                    if (editId) {
                        updatedAddresses = updatedAddresses.map(a => a.id === editId ? { ...payload, id: editId } : a);
                    } else {
                        updatedAddresses.push({ ...payload, id: Date.now() });
                    }
                    this.personalInfo.set({
                        ...current,
                        addresses: updatedAddresses
                    });
                }
                this.closeAddAddressModal();
            }
        });
    }

    private cleanupMap() {
        if (this.marker) {
            this.marker.remove();
            this.marker = undefined;
        }
        if (this.map) {
            this.map.remove();
            this.map = undefined;
        }
    }

    private initMap(initialLat?: number, initialLng?: number) {
        this.cleanupMap();

        const lat = initialLat || -12.1211;
        const lng = initialLng || -77.0298;
        const defaultCenter: [number, number] = [lng, lat];

        try {
            this.map = this.mapboxService.createMap('profileAddressMap', defaultCenter, 15);

            this.map.on('load', () => {
                this.marker = new mapboxgl.Marker({
                    draggable: true,
                    color: '#C30364'
                })
                    .setLngLat(defaultCenter)
                    .addTo(this.map!);

                this.newLatitude.set(lat);
                this.newLongitude.set(lng);

                this.marker.on('dragend', () => {
                    const lngLat = this.marker!.getLngLat();
                    this.updateCoords(lngLat.lat, lngLat.lng);
                });

                this.map!.on('click', (e) => {
                    this.marker!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
                    this.updateCoords(e.lngLat.lat, e.lngLat.lng);
                });
            });
        } catch (e) {
            console.error('Error inicializando mapa Mapbox en perfil:', e);
        }
    }

    async updateCoords(lat: number, lng: number) {
        this.newLatitude.set(lat);
        this.newLongitude.set(lng);

        const location = await this.mapboxService.reverseGeocode(lng, lat);
        if (location) {
            this.newStreetAddress.set(location.address);
            if (location.city) {
                this.newCity.set(location.city.toUpperCase());
            }
        }
    }

    useCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    this.updateCoords(lat, lng);

                    if (this.map && this.marker) {
                        this.map.flyTo({ center: [lng, lat], zoom: 16 });
                        this.marker.setLngLat([lng, lat]);
                    }
                },
                (error) => {
                    console.error('Error obteniendo ubicación actual:', error);
                    alert('No se pudo acceder a tu ubicación actual. Selecciona el punto en el mapa.');
                }
            );
        } else {
            alert('Tu navegador no soporta geolocalización.');
        }
    }

    getAddressIcon(label: string): string {
        const l = (label || '').toLowerCase();
        if (l.includes('casa') || l.includes('home')) return '🏠';
        if (l.includes('trabajo') || l.includes('oficina') || l.includes('work')) return '🏢';
        if (l.includes('gym') || l.includes('gimnasio') || l.includes('deporte')) return '🏃';
        return '📍';
    }

    selectFavoriteDish(index: number) {
        this.activeDishIndex.set(index);
    }

    getMonthAbbreviation(monthStr: string): string {
        if (!monthStr) return '';
        // monthStr is formatted e.g. "2026-03"
        const parts = monthStr.split('-');
        if (parts.length < 2) return monthStr;
        const monthNum = parseInt(parts[1], 10);
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
        return monthNames[(monthNum - 1) % 12] || monthStr;
    }

    getCategoryColor(index: number): string {
        const colors = ['#C30364', '#8B5CF6', '#F59E0B', '#06B6D4', '#64748B'];
        return colors[index % colors.length];
    }

    getBarHeightPercentage(orders: number): number {
        if (!orders || orders === 0) return 6;
        const max = this.maxMonthlyOrders();
        const pct = (orders / max) * 100;
        return Math.max(16, Math.min(100, pct));
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
                    this.loyaltyAccount.set(loyalty);
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
        const acc = this.loyaltyAccount();
        const xp = acc.totalXp;
        const currentReq = acc.xpRequiredToReachCurrentLevel ?? acc.xpRequiredForCurrentLevel ?? 0;
        const nextReq = acc.xpRequiredToReachNextLevel ?? acc.xpRequiredForNextLevel ?? 1200;

        this.levelNumber = acc.currentLevel || 6;
        this.pointsCount = acc.zisiCoins || 0;

        // Visual curve calculation
        const denominator = nextReq - currentReq;
        if (denominator > 0) {
            this.xpProgressPercentage = Math.min(100, Math.max(0, Math.round(((xp - currentReq) / denominator) * 100)));
        } else {
            this.xpProgressPercentage = 100;
        }

        // Mapping level names dynamically based on identity path
        if (acc.identityPath === 'NONE' || !acc.identityPath) {
            this.levelName = `Guardián Iniciante (Nv. ${this.levelNumber})`;
        } else {
            const pathLabel = acc.identityPath === 'KALLPA' ? 'Kallpa' : 'Sami';
            this.levelName = `Guardián ${pathLabel} (Nv. ${this.levelNumber})`;
        }
    }

    checkChoiceAvailability() {
        this.isChoiceAvailable = false;
        const acc = this.loyaltyAccount();
        if (acc.isChoiceAvailable) {
            this.isChoiceAvailable = true;
            this.choices = acc.choices || [];
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

    openPathConfirmModal(path: 'KALLPA' | 'SAMI') {
        this.pendingPath.set(path);
        this.showPathConfirmModal.set(true);
    }

    cancelPathConfirm() {
        this.showPathConfirmModal.set(false);
        this.pendingPath.set(null);
    }

    confirmChoosePath() {
        const path = this.pendingPath();
        if (!path) return;

        this.choosePath(path);
        this.showPathConfirmModal.set(false);
        this.pendingPath.set(null);
    }

    choosePath(path: 'KALLPA' | 'SAMI') {
        this.authService.chooseGuardianPath(path).subscribe({
            next: () => {
                this.loyaltyAccount.update(acc => ({ ...acc, identityPath: path }));
                this.calculateLevelStats();
            },
            error: (err) => {
                console.error('Error choosing path:', err);
                this.loyaltyAccount.update(acc => ({ ...acc, identityPath: path }));
                this.calculateLevelStats();
            }
        });
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
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
}
