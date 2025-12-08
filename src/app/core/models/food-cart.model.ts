export interface FoodCart {
  id: string;
  userId?: string;
  sessionId: string;
  restaurantId: string;
  restaurantName: string;
  items: FoodCartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
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
  modifiers: SelectedModifier[];
  requiredSelections: SelectedRequired[];
  itemTotal: number;
  specialInstructions?: string;
}

export interface SelectedModifier {
  modifierId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface SelectedRequired {
  selectionId: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

// Para agregar al carrito desde el modal
export interface AddToCartRequest {
  dishId: string;
  quantity: number;
  modifiers: SelectedModifier[];
  requiredSelections: SelectedRequired[];
  specialInstructions?: string;
}
