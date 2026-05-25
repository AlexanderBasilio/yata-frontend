import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Address {
    label: string;
    streetAddress: string;
    reference: string;
    city: string;
    latitude: number;
    longitude: number;
    isDefault: boolean;
}

export interface CustomerResponse {
    id: string;
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

    constructor() { }

    getCustomerProfile(userId: string): Observable<CustomerResponse> {
        return this.http.get<CustomerResponse>(`${this.platformUrl}/api/v1/customers/${userId}`).pipe(
            tap(customer => this.currentCustomer$.next(customer))
        );
    }

    addAddress(userId: string, address: Address): Observable<void> {
        return this.http.post<void>(`${this.platformUrl}/api/v1/customers/${userId}/addresses`, address);
    }

    updatePreferences(userId: string, preferences: string[]): Observable<CustomerResponse> {
        return this.http.put<CustomerResponse>(`${this.platformUrl}/api/v1/customers/${userId}/preferences`, { preferences }).pipe(
            tap(customer => this.currentCustomer$.next(customer))
        );
    }
}
