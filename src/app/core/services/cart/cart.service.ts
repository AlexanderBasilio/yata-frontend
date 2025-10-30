import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  unit: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Cart items en memoria (signals)
  private cartItems = signal<CartItem[]>([]);

  // Computed signals
  items = computed(() => this.cartItems());
  itemCount = computed(() =>
    this.cartItems().reduce((total, item) => total + item.quantity, 0)
  );
  total = computed(() =>
    this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0)
  );

  // Agregar producto al carrito
  addItem(product: { id: string; name: string; price: number; image: string; unit: string }): void {
    const currentItems = this.cartItems();
    const existingItemIndex = currentItems.findIndex(item => item.productId === product.id);

    if (existingItemIndex !== -1) {
      // Si ya existe, aumentar cantidad
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1
      };
      this.cartItems.set(updatedItems);
    } else {
      // Si no existe, agregar nuevo
      this.cartItems.set([
        ...currentItems,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
          unit: product.unit
        }
      ]);
    }

    console.log('✅ Producto agregado. Total items:', this.itemCount());
  }

  // Aumentar cantidad
  increaseQuantity(productId: string): void {
    const currentItems = this.cartItems();
    const updatedItems = currentItems.map(item =>
      item.productId === productId
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
    this.cartItems.set(updatedItems);
  }

  // Disminuir cantidad
  decreaseQuantity(productId: string): void {
    const currentItems = this.cartItems();
    const updatedItems = currentItems
      .map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
      .filter(item => item.quantity > 0);
    this.cartItems.set(updatedItems);
  }

  // Eliminar item
  removeItem(productId: string): void {
    const currentItems = this.cartItems();
    this.cartItems.set(currentItems.filter(item => item.productId !== productId));
  }

  // Limpiar carrito
  clearCart(): void {
    this.cartItems.set([]);
  }

  // Obtener item específico
  getItem(productId: string): CartItem | undefined {
    return this.cartItems().find(item => item.productId === productId);
  }
}
