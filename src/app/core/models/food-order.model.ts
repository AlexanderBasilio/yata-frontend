export enum PaymentMethod {
    MANUAL_TRANSFER = 'MANUAL_TRANSFER',
    // YAPE = 'YAPE',
    // PLIN = 'PLIN',
    // CASH_ON_DELIVERY = 'CASH_ON_DELIVERY'
}

export enum OrderStatus {
    CREATED = 'CREATED',
    PENDING_PAYMENT = 'PENDING_PAYMENT',
    PAID = 'PAID',
    RESTAURANT_ACCEPTED = 'RESTAURANT_ACCEPTED',
    RESTAURANT_REJECTED = 'RESTAURANT_REJECTED',
    IN_PREPARATION = 'IN_PREPARATION',
    READY_FOR_PICKUP = 'READY_FOR_PICKUP',
    IN_DELIVERY = 'IN_DELIVERY',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED'
}

export interface LocationRequest {
    address: string;
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
}

export interface LocationResponse {
    address: string;
    city?: string;
    region?: string;
    latitude: number;
    longitude: number;
}

export interface CheckoutRequest {
    cartId: string;

    // --- Datos del Cliente ---
    clientName: string;
    clientPhoneNumber: string;
    isOver18: boolean;

    // --- Logística y Notas ---
    deliveryInstructions: string;
    locationRequest: LocationRequest;

    // --- Pago ---
    paymentMethod: PaymentMethod;
    userId?: string; // Opcional
}

export interface OrderSummaryResponse {
    validatedSubtotal: number;
    deliveryFee: number;
    serviceFee: number;
    totalAmount: number;
    estimatedTime?: string;
}

export interface OrderResponse {
    orderId: string; // UUID público
    orderCode: string; // YT-XXXX human readable
    subtotalAmount: number;
    deliveryFee: number;
    serviceFee: number;
    totalAmount: number;

    status: OrderStatus;
    paymentStatus: string;
    paymentMethod: PaymentMethod;
    createdAt: string;

    restaurantId: string;
    clientName: string;
    clientPhoneNumber: string;

    location: LocationResponse;
}

export interface SummaryRequest {
    cartId: string;
    location: LocationRequest;
}