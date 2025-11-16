import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz que representa un producto del catálogo
 * Mapea la estructura del backend (Product.java)
 */
export interface Product {
  id: string; // UUID del backend
  sku: string; // Identificador de negocio
  rubro: string; // Ej: "Licores", "Mascotas"
  category: string; // Ej: "Whiskys", "Cervezas"
  brand: string; // Marca del producto (antes era 'name' en el frontend)
  name: string; // Nombre descriptivo del producto
  description?: string; // Descripción larga
  pack: string; // Ej: "1x750ml Botella"
  unit: string; // Ej: "unid"
  imageUrl: string; // URL de Cloudinary
  storeId?: string; // ID de la tienda que vende el producto
  oldPrice?: number; // Precio antes del descuento
  price: number; // Precio actual
  stockQuantity: number; // Stock disponible
  isAvailable: boolean; // Si está disponible para venta
  createdAt?: string; // Fecha de creación (ISO string)
  updatedAt?: string; // Fecha de última actualización
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/products`;

  /**
   * Obtiene todos los productos del catálogo
   * @returns Observable con lista de productos
   */
  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  /**
   * Obtiene un producto por su ID (UUID)
   * @param id UUID del producto
   */
  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtiene un producto por su SKU
   * @param sku Identificador de negocio del producto
   */
  getProductBySku(sku: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/sku/${sku}`);
  }

  /**
   * Busca productos por rubro y/o categoría
   * @param rubro Ej: "Licores"
   * @param category Ej: "Whiskys" (opcional)
   */
  searchProducts(rubro?: string, category?: string): Observable<Product[]> {
    let url = `${this.apiUrl}/search?`;

    if (rubro) {
      url += `rubro=${encodeURIComponent(rubro)}`;
    }

    if (category) {
      url += `${rubro ? '&' : ''}category=${encodeURIComponent(category)}`;
    }

    return this.http.get<Product[]>(url);
  }

  /**
   * Obtiene productos por rubro específico
   * Útil para filtrar por "Licores", "Belleza", "Comidas"
   */
  getProductsByRubro(rubro: string): Observable<Product[]> {
    return this.searchProducts(rubro);
  }

  /**
   * Obtiene productos por rubro y categoría
   * Útil para filtrar por secciones específicas (Ej: Licores > Whiskys)
   */
  getProductsByCategory(rubro: string, category: string): Observable<Product[]> {
    return this.searchProducts(rubro, category);
  }
}
