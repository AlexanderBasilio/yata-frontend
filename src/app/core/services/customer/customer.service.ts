import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Address {
    id?: number;
    label: string;
    streetAddress: string;
    reference?: string;
    city: string;
    latitude?: number;
    longitude?: number;
    isDefault: boolean;
    zoneId?: string;
}

export interface CustomerResponse {
    customerId: string;
    addresses: Address[];
    preferences: string[];
    isVip: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CustomerService {
    private http = inject(HttpClient);
    private platformUrl = environment.platformUrl;

    public currentCustomer$ = new BehaviorSubject<CustomerResponse | null>(null);
    public activeAddress$ = new BehaviorSubject<Address | null>(this.getActiveAddress());

    getActiveAddress(): Address | null {
        const saved = localStorage.getItem('zisify_active_address');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    }

    setActiveAddress(address: Address) {
        localStorage.setItem('zisify_active_address', JSON.stringify(address));
        this.activeAddress$.next(address);
    }

    clearActiveAddress() {
        localStorage.removeItem('zisify_active_address');
        this.activeAddress$.next(null);
    }

    getCustomerProfile(userId: string): Observable<CustomerResponse> {
        const url = `${this.platformUrl}/api/v1/customers/${userId}`;
        console.group('📡 [GET HTTP] Consultando Perfil del Cliente');
        console.log('🌐 Endpoint URL:', url);
        console.groupEnd();
        return this.http.get<CustomerResponse>(url).pipe(
            tap(customer => {
                console.group('📥 [GET RESPONSE] Perfil recibido del Backend');
                console.log('📦 JSON completo del perfil:', customer);
                console.log('📍 Lista de Direcciones con ZoneId:', customer?.addresses);
                console.groupEnd();
                this.currentCustomer$.next(customer);

                // Sincronizar activeAddress con las direcciones reales del backend
                const addresses = customer?.addresses || [];
                if (addresses.length === 0) {
                    this.clearActiveAddress();
                } else {
                    const saved = this.getActiveAddress();
                    const stillExists = saved ? addresses.find(a => (saved.id && a.id === saved.id) || (a.streetAddress === saved.streetAddress)) : null;
                    if (stillExists) {
                        this.setActiveAddress(stillExists);
                    } else {
                        const defaultOrFirst = addresses.find(a => a.isDefault) || addresses[0];
                        this.setActiveAddress(defaultOrFirst);
                    }
                }
            })
        );
    }

    addAddress(userId: string, address: Address): Observable<any> {
        const url = `${this.platformUrl}/api/v1/customers/${userId}/addresses`;
        console.group('🚀 [POST HTTP] Guardando Nueva Dirección en Backend');
        console.log('🌐 Endpoint URL:', url);
        console.log('📦 Payload JSON enviado:', JSON.stringify(address, null, 2));
        console.groupEnd();
        return this.http.post<any>(url, address).pipe(
            tap(res => {
                console.group('📥 [POST RESPONSE] Respuesta del servidor al crear dirección');
                console.log('✅ Status 201 Created. Body devuelto:', res);
                console.groupEnd();
            })
        );
    }

    updateAddress(userId: string, addressId: number, address: Address): Observable<any> {
        const url = `${this.platformUrl}/api/v1/customers/${userId}/addresses/${addressId}`;
        console.group('🚀 [PUT HTTP] Actualizando Dirección Existente en Backend');
        console.log('🌐 Endpoint URL:', url);
        console.log('🔑 Address ID:', addressId);
        console.log('📦 Payload JSON enviado:', JSON.stringify(address, null, 2));
        console.groupEnd();
        return this.http.put<any>(url, address).pipe(
            tap(res => {
                console.group('📥 [PUT RESPONSE] Respuesta del servidor al editar dirección');
                console.log('✅ Status 200 OK. Body devuelto:', res);
                console.groupEnd();
            })
        );
    }

    deleteAddress(userId: string, addressId: number): Observable<any> {
        const url = `${this.platformUrl}/api/v1/customers/${userId}/addresses/${addressId}`;
        console.group('🗑️ [DELETE HTTP] Eliminando Dirección en Backend');
        console.log('🌐 Endpoint URL:', url);
        console.log('🔑 Address ID a eliminar:', addressId);
        console.groupEnd();
        return this.http.delete<any>(url).pipe(
            tap(res => {
                console.group('📥 [DELETE RESPONSE] Respuesta del servidor al eliminar dirección');
                console.log('✅ Status 204 No Content / OK');
                console.groupEnd();
            })
        );
    }

    updatePreferences(userId: string, preferences: string[]): Observable<CustomerResponse> {
        return this.http.put<CustomerResponse>(`${this.platformUrl}/api/v1/customers/${userId}/preferences`, { preferences }).pipe(
            tap(customer => this.currentCustomer$.next(customer))
        );
    }

    getOrdersCount(userId: string): Observable<{ count: number }> {
        return this.http.get<{ count: number }>(`${this.platformUrl}/api/v1/customers/${userId}/orders-count`);
    }

    getZPoints(userId: string): Observable<{ points: number }> {
        return this.http.get<{ points: number }>(`${this.platformUrl}/api/v1/customers/${userId}/z-points`);
    }
}
