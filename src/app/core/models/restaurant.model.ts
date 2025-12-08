export interface Restaurant {
  id: string;
  name: string;
  slogan: string;
  description?: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  logoUrl: string;

  // Ubicación
  addressLine: string;
  district: string;
  city: string;
  latitude: number;
  longitude: number;

  // ✅ CAMBIO: specialties ahora es un array de objetos
  specialties: SpecialtyItem[];

  categories: string[];
  preparationTime: number;
  minimumOrder: number;
  isActive: boolean;

  // ✅ NUEVO: schedule (opcional por ahora)
  schedule?: RestaurantSchedule;
}

// ✅ NUEVO: Interfaz para SpecialtyItem
export interface SpecialtyItem {
  name: string;
  order: number;
}

// ✅ NUEVO: Interfaz para el horario del restaurante
export interface RestaurantSchedule {
  // Por ahora lo dejamos simple, tu backend lo definirá mejor
  [key: string]: any;
}

export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  ingredients: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  preparationTime: number;
  modifiers?: DishModifier[];
  requiredSelections?: RequiredSelection[];
}

export interface DishModifier {
  id: string;
  dishId: string;
  name: string;
  price: number;
  type: 'OPTIONAL';
  isAvailable: boolean;
}

export interface RequiredSelection {
  id: string;
  dishId: string;
  title: string;
  minSelections: number;
  maxSelections: number;
  options: SelectionOption[];
}

export interface SelectionOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isAvailable: boolean;
}
