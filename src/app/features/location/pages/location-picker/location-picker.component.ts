import { Component, signal, computed, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../../../core/services/cart/cart.service';
import { MapboxService, LocationResult } from '../../../../core/services/location/mapbox.service';
import { OrderService, CreateOrderRequest } from '../../../../core/services/order/order.service';
import mapboxgl from 'mapbox-gl';

interface OrderSummary {
  subtotal: number;
  servicecost: number;
  shippingCost: number;
  total: number;
}

interface OrderData {
  items: any[];
  location: LocationResult;
  payment: {
    method: 'exact' | 'cash';
    cashAmount: number | null;
    changeAmount: number;
  };
  deliveryNote: string;
  summary: OrderSummary;
  timestamp: string;
  customerName: string;
  customerPhone: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss'
})
export class LocationPickerComponent implements OnInit, OnDestroy, AfterViewInit {
  private map!: mapboxgl.Map;
  private marker!: mapboxgl.Marker;

  // Ubicación
  selectedLocation = signal<LocationResult | null>(null);
  confirmedLocation = signal<LocationResult | null>(null); // Nueva: ubicación confirmada
  searchQuery = signal('');
  searchResults = signal<any[]>([]);
  showSearchResults = signal(false);

  // Shipping cost dinámico
  calculatedShippingCost = signal<number>(0); // Inicializado en 0, se calculará al confirmar
  showConfirmLocationButton = signal(false); // Nueva: mostrar botón de confirmar

  // Método de pago
  paymentMethod = signal<'exact' | 'cash'>('exact');
  cashAmount = signal<number | null>(null);

  // Mensaje para repartidor
  deliveryNote = signal('');

  // Datos de contacto
  customerName = signal('');
  customerPhone = signal('');

  // Confirmaciones
  isAdult = signal(false);

  // Modales
  showConfirmModal = signal(false);
  showIntiCoinsModal = signal(false);
  showSuccessModal = signal(false);

  // IntiCoins acumulados
  accumulatedIntiCoins = signal<number>(0);

  // Datos del carrito
  cartItems = computed(() => this.cartService.items());

  // Resumen de orden - MODIFICADO para usar el shipping cost dinámico
  orderSummary = computed<OrderSummary>(() => {
    const subtotal = this.cartService.total();
    const servicecost = 0.50;
    const shippingCost = this.calculatedShippingCost(); // Usar el costo calculado
    const total = subtotal + servicecost + shippingCost;

    return { subtotal, servicecost, shippingCost, total };
  });

  changeAmount = computed(() => {
    if (this.paymentMethod() === 'cash' && this.cashAmount()) {
      const change = this.cashAmount()! - this.orderSummary().total;
      return change > 0 ? change : 0;
    }
    return 0;
  });

  // Estados
  isLoadingMap = signal(true);
  isSubmitting = signal(false);
  isSearching = signal(false);
  isCalculatingShipping = signal(false); // Nueva: estado de cálculo de envío

  // Datos de pedido temporal (en memoria)
  private tempOrderData: OrderData | null = null;

  constructor(
    private cartService: CartService,
    private router: Router,
    private mapboxService: MapboxService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    if (this.cartItems().length === 0) {
      alert('Tu carrito está vacío');
      this.router.navigate(['/liquor/catalog']);
    }
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  initMap(): void {
    const defaultCenter: [number, number] = [-76.876778, -12.003528];

    this.map = this.mapboxService.createMap('map', defaultCenter, 14);

    this.map.on('load', () => {
      this.isLoadingMap.set(false);

      this.marker = new mapboxgl.Marker({
        draggable: true,
        color: '#0F456E'
      })
        .setLngLat(defaultCenter)
        .addTo(this.map);

      this.marker.on('dragend', () => {
        const lngLat = this.marker.getLngLat();
        this.onMarkerDrag(lngLat.lng, lngLat.lat);
      });

      this.map.on('click', (e) => {
        this.marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        this.onMarkerDrag(e.lngLat.lng, e.lngLat.lat);
      });

      // No llamar onMarkerDrag al inicio para no calcular automáticamente
    });
  }

  async onMarkerDrag(lng: number, lat: number): Promise<void> {

    const location = await this.mapboxService.reverseGeocode(lng, lat);
    if (location) {
      this.selectedLocation.set(location);
      this.showConfirmLocationButton.set(true); // Mostrar botón de confirmar
      // Resetear la ubicación confirmada si el usuario mueve el marcador
      if (this.confirmedLocation()) {
        this.confirmedLocation.set(null);
        this.calculatedShippingCost.set(0);
      }
    }
  }

  async onSearchInput(): Promise<void> {
    const query = this.searchQuery().trim();

    if (query.length < 3) {
      this.searchResults.set([]);
      this.showSearchResults.set(false);
      return;
    }

    this.isSearching.set(true);
    const results = await this.mapboxService.searchAddress(query);
    this.searchResults.set(results);
    this.showSearchResults.set(results.length > 0);
    this.isSearching.set(false);
  }

  selectSearchResult(result: any): void {
    const [lng, lat] = result.center;

    this.map.flyTo({ center: [lng, lat], zoom: 16 });
    this.marker.setLngLat([lng, lat]);

    this.selectedLocation.set({
      address: result.place_name,
      latitude: lat,
      longitude: lng
    });

    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showSearchResults.set(false);
    this.showConfirmLocationButton.set(true); // Mostrar botón
    // Resetear ubicación confirmada
    if (this.confirmedLocation()) {
      this.confirmedLocation.set(null);
      this.calculatedShippingCost.set(0);
    }
  }

  // NUEVO: Confirmar ubicación y calcular costo de envío
  async confirmLocation(): Promise<void> {
    const location = this.selectedLocation();
    if (!location) {
      alert('Por favor selecciona una ubicación primero');
      return;
    }

    this.isCalculatingShipping.set(true);

    try {
      const response = await this.orderService.calculateShipping({
        destLat: location.latitude,
        destLon: location.longitude
      }).toPromise();

      if (response) {
        this.calculatedShippingCost.set(response.shippingCost);
        this.confirmedLocation.set(location);
        this.showConfirmLocationButton.set(false);

        console.log('✅ Costo de envío calculado:', {
          cost: response.shippingCost,
          currency: response.currency
        });

        // Mostrar mensaje de éxito
        alert(`✅ Ubicación confirmada\nCosto de envío: S/ ${response.shippingCost.toFixed(2)}`);
      }
    } catch (error: any) {
      console.error('❌ Error al calcular envío:', error);
      const errorMessage = error?.error || 'No se pudo calcular el costo de envío. Intenta con otra ubicación.';
      alert(`❌ ${errorMessage}`);
      // Resetear todo si hay error
      this.selectedLocation.set(null);
      this.confirmedLocation.set(null);
      this.calculatedShippingCost.set(0);
      this.showConfirmLocationButton.set(false);
    } finally {
      this.isCalculatingShipping.set(false);
    }
  }

  onPaymentMethodChange(method: 'exact' | 'cash'): void {
    this.paymentMethod.set(method);
    if (method === 'exact') {
      this.cashAmount.set(null);
    }
  }

  onCashAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    this.cashAmount.set(isNaN(value) ? null : value);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    this.customerPhone.set(value);
    input.value = value;
  }

  validateOrder(): boolean {
    // MODIFICADO: Verificar que la ubicación esté confirmada
    if (!this.confirmedLocation()) {
      alert('Por favor confirma tu ubicación de entrega');
      return false;
    }

    if (!this.customerName().trim()) {
      alert('Por favor ingresa tu nombre completo');
      return false;
    }

    if (!this.customerPhone() || this.customerPhone().length !== 9) {
      alert('Por favor ingresa un número de celular válido (9 dígitos)');
      return false;
    }

    if (!this.isAdult()) {
      alert('Debes confirmar que eres mayor de edad');
      return false;
    }

    if (this.paymentMethod() === 'cash') {
      if (!this.cashAmount() || this.cashAmount()! <= 0) {
        alert('Por favor ingresa un monto válido');
        return false;
      }

      if (this.cashAmount()! < this.orderSummary().total) {
        alert('El monto ingresado debe ser mayor o igual al total');
        return false;
      }
    }

    return true;
  }

  openConfirmModal(): void {
    if (this.validateOrder()) {
      this.tempOrderData = {
        items: this.cartItems(),
        location: this.confirmedLocation()!, // Usar la ubicación confirmada
        payment: {
          method: this.paymentMethod(),
          cashAmount: this.cashAmount(),
          changeAmount: this.changeAmount()
        },
        deliveryNote: this.deliveryNote(),
        summary: this.orderSummary(),
        timestamp: new Date().toISOString(),
        customerName: this.customerName(),
        customerPhone: `+51${this.customerPhone()}`
      };

      this.showConfirmModal.set(true);
    }
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
  }

  cancelOrder(): void {
    if (confirm('¿Estás seguro de cancelar tu compra?')) {
      this.tempOrderData = null;
      this.router.navigate(['/liquor/catalog']);
    }
  }

  async confirmOrder(): Promise<void> {
    if (!this.tempOrderData) return;

    this.isSubmitting.set(true);
    this.showConfirmModal.set(false);

    try {
      const orderRequest: CreateOrderRequest = {
        items: this.tempOrderData.items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit
        })),
        location: {
          address: this.tempOrderData.location.address,
          latitude: this.tempOrderData.location.latitude,
          longitude: this.tempOrderData.location.longitude,
          city: 'Lima',
          region: 'Lima'
        },
        payment: {
          method: this.tempOrderData.payment.method,
          cashAmount: this.tempOrderData.payment.cashAmount,
          changeAmount: this.tempOrderData.payment.changeAmount
        },
        summary: {
          subtotal: this.tempOrderData.summary.subtotal,
          serviceCost: this.tempOrderData.summary.servicecost,
          shippingCost: this.tempOrderData.summary.shippingCost,
          total: this.tempOrderData.summary.total
        },
        deliveryNote: this.tempOrderData.deliveryNote,
        customerName: this.tempOrderData.customerName,
        customerPhone: this.tempOrderData.customerPhone
      };

      console.log('📤 Enviando pedido completo:', orderRequest);

      const response = await this.orderService.createOrder(orderRequest).toPromise();

      console.log('✅ Pedido guardado:', response);

      // ✨ NUEVO: Calcular IntiCoins (1000 IntiCoins por cada S/ 1 gastado, redondeado)
      const intiCoins = Math.round(this.tempOrderData.summary.total * 1000);
      this.accumulatedIntiCoins.set(intiCoins);

      // ✨ NUEVO: Mostrar primero el modal de IntiCoins
      this.showIntiCoinsModal.set(true);

      // Ya no limpiamos el carrito ni redirigimos aquí
      // Eso se hará después de cerrar el modal de IntiCoins

    } catch (error: any) {
      console.error('❌ Error al guardar orden:', error);
      alert(error?.error?.message || 'Hubo un error al procesar tu orden');
      this.tempOrderData = null;
      this.showIntiCoinsModal.set(false); // Asegurar que el modal no se muestre si hay error
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * ✨ NUEVO: Cierra el modal de IntiCoins y muestra el modal de éxito
   * Luego limpia el carrito y redirige al catálogo
   */
  closeIntiCoinsModal(): void {
    this.showIntiCoinsModal.set(false);
    this.showSuccessModal.set(true);

    // Limpiar carrito y datos temporales
    this.tempOrderData = null;
    this.cartService.clearCart();

    // Redirigir al catálogo después de 3 segundos
    setTimeout(() => {
      this.router.navigate(['/liquor/catalog']);
    }, 3000);
  }

  goBack(): void {
    this.router.navigate(['/liquor/cart']);
  }
}
