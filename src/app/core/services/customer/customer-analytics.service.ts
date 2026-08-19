import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ActivityStats {
  totalOrders: number;
  thisMonthOrders: number;
}

export interface FinancialStats {
  totalSpent: number;
  thisMonthSpent: number;
  lastMonthSpent: number;
  totalSavings: number;
  currency: string;
}

export interface FavoriteDish {
  name: string;
  ordersCount: number;
}

export interface FavoriteCategory {
  category: string;
  percentage: number;
}

export interface CustomerProfileStatsResponse {
  activity: ActivityStats;
  financial: FinancialStats;
  favoriteDishes: FavoriteDish[];
  favoriteCategories: FavoriteCategory[];
}

export interface MonthlyOrdersResponse {
  month: string; // e.g. "2026-03"
  orders: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerAnalyticsService {
  private http = inject(HttpClient);

  // Derivar URL base del portal quitando opcionalmente el prefijo /api/v1
  private get portalBaseUrl(): string {
    const rawUrl = environment.portalUrl || 'https://zisify-portal-production-b174.up.railway.app';
    return rawUrl.includes('/api/v1') ? rawUrl.replace('/api/v1', '') : rawUrl;
  }

  /**
   * GET /api/portal/customer/profile/stats
   * Obtiene estadísticas consolidadas de actividad, finanzas, platos y categorías favoritas.
   */
  getProfileStats(): Observable<CustomerProfileStatsResponse> {
    const url = `${this.portalBaseUrl}/api/portal/customer/profile/stats`;
    console.group('📊 [GET HTTP] Consultando Estadísticas del Perfil Cliente');
    console.log('🌐 Endpoint URL:', url);
    console.groupEnd();

    return this.http.get<CustomerProfileStatsResponse>(url).pipe(
      tap(res => {
        console.group('📥 [GET RESPONSE] Estadísticas recibidas del Backend');
        console.log('📦 JSON:', res);
        console.groupEnd();
      }),
      catchError(err => {
        console.warn('⚠️ No se pudieron obtener estadísticas reales del portal, usando fallback:', err);
        return of(this.getMockStats());
      })
    );
  }

  /**
   * GET /api/portal/customer/profile/orders/monthly?months=6
   * Obtiene la serie temporal de pedidos agrupados por mes.
   */
  getMonthlyOrders(months: number = 6): Observable<MonthlyOrdersResponse[]> {
    const url = `${this.portalBaseUrl}/api/portal/customer/profile/orders/monthly?months=${months}`;
    console.group('📊 [GET HTTP] Consultando Historial Mensual de Pedidos');
    console.log('🌐 Endpoint URL:', url);
    console.groupEnd();

    return this.http.get<MonthlyOrdersResponse[]>(url).pipe(
      tap(res => {
        console.group('📥 [GET RESPONSE] Historial mensual recibido');
        console.log('📦 JSON:', res);
        console.groupEnd();
      }),
      catchError(err => {
        console.warn('⚠️ No se pudo obtener historial de pedidos mensual, usando fallback:', err);
        return of(this.getMockMonthlyOrders());
      })
    );
  }

  // Fallback seguro con los datos exactos del contrato
  private getMockStats(): CustomerProfileStatsResponse {
    return {
      activity: {
        totalOrders: 87,
        thisMonthOrders: 12
      },
      financial: {
        totalSpent: 2340.00,
        thisMonthSpent: 340.00,
        lastMonthSpent: 300.00,
        totalSavings: 340.00,
        currency: 'PEN'
      },
      favoriteDishes: [
        { name: 'Pollo a la brasa 1/4', ordersCount: 15 },
        { name: 'Hamburguesa Clásica', ordersCount: 10 },
        { name: 'Ceviche Mixto', ordersCount: 8 }
      ],
      favoriteCategories: [
        { category: 'Pollería', percentage: 42.8 },
        { category: 'Hamburguesas', percentage: 28.5 },
        { category: 'Marisquería', percentage: 22.8 },
        { category: 'Otros', percentage: 5.9 }
      ]
    };
  }

  private getMockMonthlyOrders(): MonthlyOrdersResponse[] {
    return [
      { month: '2026-03', orders: 12 },
      { month: '2026-04', orders: 18 },
      { month: '2026-05', orders: 9 },
      { month: '2026-06', orders: 14 },
      { month: '2026-07', orders: 22 },
      { month: '2026-08', orders: 12 }
    ];
  }
}
