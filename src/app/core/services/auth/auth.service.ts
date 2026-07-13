import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    userId: string;
    email: string;
    roles: string[];
}

export interface UserResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    status: string;
    roles: string[];
    balance: number;
    loyaltyPoints: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    // Usamos platformUrl para el nuevo monolito de Identidad
    private platformUrl = environment.platformUrl;

    private readonly TOKEN_KEY = 'zisify_access_token';
    private readonly USER_ID_KEY = 'zisify_user_id';

    // Estado reactivo para saber si hay usuario logueado en la UI
    public currentUser$ = new BehaviorSubject<UserResponse | null>(null);

    constructor() { }

    login(credentials: { email: string; password: string }): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.platformUrl}/api/v1/auth/login`, credentials).pipe(
            tap(response => {
                this.setToken(response.accessToken);
                this.setUserId(response.userId);
            })
        );
    }

    register(userData: any): Observable<UserResponse> {
        return this.http.post<UserResponse>(`${this.platformUrl}/api/v1/users/register`, userData);
    }

    getProfile(userId: string): Observable<UserResponse> {
        // El token debe ser enviado por un interceptor, pero por seguridad y rapidez inicial, lo puedes enviar explícito si no hay interceptor global aún.
        // Usaremos un JWT Interceptor que crearemos a continuación.
        return this.http.get<UserResponse>(`${this.platformUrl}/api/v1/users/id/${userId}`).pipe(
            tap(user => this.currentUser$.next(user))
        );
    }

    // Utilidades LocalStorage
    setToken(token: string) {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    setUserId(userId: string) {
        localStorage.setItem(this.USER_ID_KEY, userId);
    }

    getUserId(): string | null {
        return localStorage.getItem(this.USER_ID_KEY);
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_ID_KEY);
        this.currentUser$.next(null);
    }

    getMyLoyaltyStatus(): Observable<LoyaltyAccountResponse> {
        const url = environment.portalUrl.replace('/api/v1', '/api/portal/customer/loyalty/my-status');
        return this.http.get<LoyaltyAccountResponse>(url);
    }

    chooseGuardianPath(path: 'KALLPA' | 'SAMI'): Observable<void> {
        const url = environment.portalUrl.replace('/api/v1', '/api/portal/customer/loyalty/choose-path');
        return this.http.post<void>(`${url}?path=${path}`, {});
    }

    chooseDeity(code: string): Observable<void> {
        const url = environment.portalUrl.replace('/api/v1', '/api/portal/customer/loyalty/choose-deity');
        return this.http.post<void>(`${url}?code=${code}`, {});
    }
}

export interface DeityOption {
    code: string;
    name: string;
    description: string;
    benefit: string;
    category: 'PEQUENO' | 'MEDIO' | 'GRANDE';
    icon: string;
}

export interface LoyaltyAccountResponse {
    zisiCoins: number;       // Moneda virtual
    totalXp: number;            // Progreso del Guardián
    currentLevel: number;    // Nivel calculado dinámicamente en base al XP
    identityPath: 'KALLPA' | 'SAMI' | 'NONE';     // "KALLPA", "SAMI" o "NONE"
    xpRequiredForCurrentLevel: number; // XP donde inició este nivel
    xpRequiredForNextLevel: number;    // XP necesaria para pasar al siguiente nivel
    isChoiceAvailable?: boolean;
    choices?: DeityOption[];
}
