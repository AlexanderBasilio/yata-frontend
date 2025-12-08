import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Restaurant, Dish } from '../../models/restaurant.model';

export interface Specialty {
  name: string;
  iconUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private http = inject(HttpClient);
  // ✅ CAMBIO: Quitar /v1 y usar /api/restaurants directamente
  private apiUrl = `${environment.restaurantServiceUrl}/api/restaurants`;

  /**
   * Obtener todos los restaurantes
   * GET /api/restaurants
   */
  getAllRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(this.apiUrl);
  }

  /**
   * Obtener restaurante por ID
   * GET /api/restaurants/{id}
   */
  getRestaurantById(id: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.apiUrl}/${id}`);
  }

  /**
   * Buscar restaurantes por especialidad
   * GET /api/restaurants?specialty=Chifa
   */
  searchBySpecialty(specialty: string): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(this.apiUrl, {
      params: { specialty }
    });
  }

  /**
   * Obtener platillos de un restaurante
   * GET /api/restaurants/{restaurantId}/dishes
   */
  getDishesByRestaurant(restaurantId: string): Observable<Dish[]> {
    return this.http.get<Dish[]>(`${this.apiUrl}/${restaurantId}/dishes`);
  }

  /**
   * Obtener detalle de un platillo
   * GET /api/restaurants/{restaurantId}/dishes/{dishId}
   */
  getDishById(restaurantId: string, dishId: string): Observable<Dish> {
    return this.http.get<Dish>(`${this.apiUrl}/${restaurantId}/dishes/${dishId}`);
  }

  /**
   * Obtener especialidades disponibles (las 16)
   */
  getSpecialties(): Specialty[] {
    const iconBase = 'https://res.cloudinary.com/dhgsvmcmc/image/upload/c_scale,w_64,h_64';

    return [
      { name: 'Chifa', iconUrl: `${iconBase}/food-icons/chifa.png?v=2` },
      { name: 'Pollería', iconUrl: `${iconBase}/food-icons/polleria.png?v=2` },
      { name: 'Pizzería', iconUrl: `${iconBase}/food-icons/pizzeria.png` },
      { name: 'Marisquería', iconUrl: `${iconBase}/food-icons/marisqueria.png` },
      { name: 'Tradicional', iconUrl: `${iconBase}/food-icons/tradicional.png` },
      { name: 'Criolla', iconUrl: `${iconBase}/food-icons/criolla.png` },
      { name: 'Frituras y Crocantes', iconUrl: `${iconBase}/food-icons/friturasycrocantes.png` },
      { name: 'Nikkei', iconUrl: `${iconBase}/food-icons/nikkei.png` },
      { name: 'Hamburguesas', iconUrl: `${iconBase}/food-icons/hamburguesas.png` },
      { name: 'Carnes y Parrillas', iconUrl: `${iconBase}/food-icons/carnesyparrillas.png` },
      { name: 'Desayunos', iconUrl: `${iconBase}/food-icons/desayunos.png` },
      { name: 'Fuente de Soda', iconUrl: `${iconBase}/food-icons/fuentedesoda.png` },
      { name: 'Pastas', iconUrl: `${iconBase}/food-icons/pastas.png` },
      { name: 'Caldos y Sopas', iconUrl: `${iconBase}/food-icons/caldosYsopas.png` },
      { name: 'Pasteleria', iconUrl: `${iconBase}/food-icons/pasteleria.png` },
      { name: 'Saludables', iconUrl: `${iconBase}/food-icons/saludables.png` }
    ];
  }
}
