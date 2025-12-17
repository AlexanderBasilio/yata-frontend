import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Restaurant, Dish, DishSummary } from '../../models/restaurant.model';

export interface Specialty {
  name: string;
  iconUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private http = inject(HttpClient);
  private restaurantApiUrl = `${environment.restaurantServiceUrl}/api/restaurants`;
  private dishApiUrl = `${environment.restaurantServiceUrl}/api/dishes`; // ← NUEVO

  /**
   * Obtener todos los restaurantes
   */
  getAllRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(this.restaurantApiUrl);
  }

  /**
   * Obtener restaurante por ID
   */
  getRestaurantById(id: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.restaurantApiUrl}/${id}`);
  }

  /**
   * Buscar restaurantes por especialidad
   */
  searchBySpecialty(specialty: string): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(this.restaurantApiUrl, {
      params: { specialty }
    });
  }

  /**
   * ✅ CAMBIADO: Obtener platillos de un restaurante
   * Ahora usa /api/dishes/restaurant/{restaurantId}
   * Y devuelve DishSummary[] que hay que mapear a Dish[]
   */
  getDishesByRestaurant(restaurantId: string): Observable<Dish[]> {
    return this.http.get<DishSummary[]>(`${this.dishApiUrl}/restaurant/${restaurantId}`).pipe(
      map(summaries => summaries.map(summary => this.mapSummaryToDish(summary, restaurantId)))
    );
  }

  /**
   * ✅ NUEVO: Mapear DishSummary a Dish
   * (El summary no tiene modifiers ni requiredSelections, pero los agregamos vacíos)
   */
  private mapSummaryToDish(summary: DishSummary, restaurantId: string): Dish {
    return {
      id: summary.id,
      restaurantId: restaurantId,
      name: summary.name,
      description: summary.description,
      ingredients: '', // No viene en el summary
      price: summary.price,
      imageUrl: summary.imageUrl,
      category: summary.category,
      isAvailable: summary.available, // ← Mapear "available" a "isAvailable"
      preparationTime: 0, // No viene en el summary
      modifiers: [], // Se cargarán al abrir el modal
      requiredSelections: [] // Se cargarán al abrir el modal
    };
  }

  /**
   * ✅ NUEVO: Obtener detalle completo de un platillo
   * GET /api/dishes/{id}
   */
  getDishById(dishId: string): Observable<Dish> {
    return this.http.get<Dish>(`${this.dishApiUrl}/${dishId}`);
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
