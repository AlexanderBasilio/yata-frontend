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

  // Control de Horarios y Cierre de Emergencia
  isTemporarilyClosed: boolean;
  isOpen: boolean;

  schedule?: RestaurantSchedule;
}

// ✅ NUEVO: Interfaz para SpecialtyItem
export interface SpecialtyItem {
  name: string;
  order: number;
}

// ✅ NUEVO: Interfaz para el horario del restaurante
export interface RestaurantSchedule {
  isOpen24Hours: boolean;
  schedule: {
    [key: string]: {
      openTime: string;
      closeTime: string;
      isOpenThisDay: boolean;
    }
  }
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

// ✅ NUEVO: DishSummary (para la lista)
export interface DishSummary {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean; // Backend usa isAvailable
  category: string;
  description: string;
}

// ✅ CAMBIADO: DishModifier ahora tiene options
export interface DishModifier {
  id: string;
  dishId: string;
  name: string;
  maxSelection: number; // ← NUEVO
  isAvailable: boolean;
  options: DishModifierOption[]; // ← NUEVO: Array de opciones
}

// ✅ NUEVO: DishModifierOption
export interface DishModifierOption {
  id: string;
  modifierId: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

// ✅ CAMBIADO: RequiredSelection
export interface RequiredSelection {
  id: string;
  title: string;
  minSelections: number;
  maxSelections: number;
  isAvailable: boolean; // ← NUEVO: Disponibilidad del grupo entero de obligatorios
  options: SelectionOption[];
}

// ✅ SelectionOption (sin cambios)
export interface SelectionOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isAvailable: boolean;
}
