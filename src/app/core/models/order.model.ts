export interface AppliedDiscount {
    type: string;
    displayName: string;
    amount: number;
    code?: string | null;
}

export interface OrderResponse {
    orderId: string;
    orderCode: string;
    subtotalAmount: number;
    deliveryFee: number;
    serviceFee: number;
    discountAmount?: number;
    appliedDiscounts?: AppliedDiscount[];
    totalAmount: number;
    currency: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    operationNumber?: string;
    createdAt: string;
    restaurantId: string;
    restaurantName: string;
    clientName: string;
    clientPhoneNumber: string;
    customerEmail: string;
    location: any;
    deliveryInstructions?: string;
    items: OrderItemResponse[];
}

export interface OrderItemResponse {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    basePrice: number;
    itemTotal: number;
}

export type OrderStatus =
    'CREATED' |
    'PENDING_PAYMENT' |
    'WAITING_APPROVAL' |
    'PAYMENT_CONFIRMED' |
    'ACCEPTED_BY_RESTAURANT' |
    'PREPARING' |
    'READY_FOR_PICKUP' |
    'ON_THE_WAY' |
    'DELIVERED' |
    'CANCELLED' |
    'REJECTED_BY_RESTAURANT';

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export type PaymentMethod = 'CASH' | 'CARD' | 'MANUAL_TRANSFER';

export interface PaymentReportRequest {
    operationNumber: string;
}
