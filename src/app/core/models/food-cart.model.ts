export interface FoodCart {
  id: string;
  userId?: string;
  sessionId?: string;
  restaurantId: string;
  restaurantName: string;
  items: FoodCartItem[];
  subtotal: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface FoodCartItem {
  id: string;
  dishId: string;
  dishName: string;
  dishImageUrl: string;
  basePrice: number;
  quantity: number;
  packagingFee?: number; // 🎯 NUEVO: Costo de tápers
  includeCutlery?: boolean; // 🎯 NUEVO: Si incluye cubiertos
  cutleryFee?: number; // 🎯 NUEVO: Costo de cubiertos
  modifiers: SelectedModifier[];
  requiredSelections: SelectedRequired[];
  itemTotal: number;
  specialInstructions?: string;
}

// ✅ ACTUALIZADO: Coincide con SelectedModifierDTO del backend
export interface SelectedModifier {
  modifierGroupId: string;      // UUID del grupo de modificadores
  modifierId: string;    // UUID de la opción elegida
  modifierGroupName: string;    // Nombre del grupo (ej: "Extras")
  modifierName: string;         // Nombre de la opción (ej: "Papas grandes")
  price: number;
  quantity: number;
}

// ✅ ACTUALIZADO: Coincide con SelectedRequiredDTO del backend
export interface SelectedRequired {
  requiredGroupId: string;         // UUID del grupo obligatorio
  optionId: string;         // UUID de la opción elegida
  requiredGroupName: string;       // Nombre del grupo (ej: "Elige tu bebida")
  optionName: string;       // Nombre de la opción (ej: "Coca Cola")
  priceAdjustment: number;
}

// ✅ ACTUALIZADO: Para agregar al carrito (coincide con AddItemRequest)
export interface AddToCartRequest {
  dishId: string;
  dishName: string;
  dishImageUrl: string;
  basePrice: number;
  quantity: number;
  includeCutlery?: boolean; // 🎯 NUEVO: Si el cliente marcó "Incluir cubiertos"
  modifiers: SelectedModifier[];
  requiredSelections: SelectedRequired[];
  specialInstructions?: string;
  restaurantId: string;
  restaurantName: string;
}

// 🎯 NUEVO: Para editar un item en el carrito (UpdateItemRequest)
export interface UpdateCartItemRequest {
  quantity?: number;
  includeCutlery?: boolean;
  modifiers?: SelectedModifier[];
  requiredSelections?: SelectedRequired[];
  specialInstructions?: string;
}
