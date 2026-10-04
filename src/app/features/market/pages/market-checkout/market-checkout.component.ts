import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import mapboxgl from 'mapbox-gl';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { CustomerService, Address } from '../../../../core/services/customer/customer.service';
import { MapboxService } from '../../../../core/services/location/mapbox.service';
import { MarketCartService } from '../../../../core/services/market/market-cart.service';
import { MarketOrderService } from '../../../../core/services/market/market-order.service';
import {
  MarketCheckoutRequest,
  MarketDeliveryLocationDto,
  MarketOrderSummaryResponse,
  MarketPaymentMethod
} from '../../../../core/models/market.model';

@Component({
  selector: 'app-market-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './market-checkout.component.html',
  styleUrl: './market-checkout.component.scss'
})
export class MarketCheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public authService = inject(AuthService);
  public customerService = inject(CustomerService);
  public mapboxService = inject(MapboxService);
  public cartService = inject(MarketCartService);
  public orderService = inject(MarketOrderService);

  // Flujo en dos tiempos: 1 = Mapa y Dirección, 2 = Resumen y Pago
  currentStep = signal<1 | 2>(1);

  // Cart computed
  cart = computed(() => this.cartService.cart());

  // Checkout Form
  checkoutForm!: FormGroup;

  // Mapbox instances
  private map?: mapboxgl.Map;
  private marker?: mapboxgl.Marker;

  // Live order summary from backend
  orderSummary = signal<MarketOrderSummaryResponse | null>(null);
  isLoadingSummary = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isLocatingGps = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Selected address state
  savedAddresses = signal<Address[]>([]);
  selectedAddressId = signal<number | null>(null);

  // Payment method options
  selectedPaymentMethod = signal<MarketPaymentMethod>('MANUAL_TRANSFER');

  ngOnInit(): void {
    // 1. Validar que exista carrito con productos
    const currentCart = this.cart();
    if (!currentCart || currentCart.totalItemsCount === 0) {
      this.cartService.getCart().subscribe(c => {
        if (!c || c.totalItemsCount === 0) {
          alert('Tu carrito de mercado está vacío.');
          this.router.navigate(['/market']);
        } else {
          this.initCheckout();
        }
      });
      return;
    }

    this.initCheckout();
  }

  ngAfterViewInit(): void {
    if (this.currentStep() === 1) {
      setTimeout(() => this.initMap(), 150);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initCheckout(): void {
    // Construir formulario reactivo
    this.checkoutForm = this.fb.group({
      clientName: ['', [Validators.required, Validators.minLength(2)]],
      clientPhoneNumber: ['', [Validators.required]],
      customerEmail: ['', [Validators.email]],
      address: ['', [Validators.required, Validators.minLength(4)]],
      reference: [''],
      latitude: [-12.08542, [Validators.required]],
      longitude: [-77.03456, [Validators.required]],
      city: ['LIMA'],
      district: [''],
      deliveryInstructions: ['']
    });

    // Autocompletar datos del cliente
    this.prefillCustomerData();

    // Cargar direcciones guardadas del perfil
    this.loadSavedAddresses();
  }

  private prefillCustomerData(): void {
    const user = this.authService.currentUser$.value;
    const userId = this.authService.getUserId();

    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '';
      this.checkoutForm.patchValue({
        clientName: fullName,
        clientPhoneNumber: user.phoneNumber || '',
        customerEmail: user.email || ''
      });
    }

    if (userId) {
      this.authService.getProfile(userId).subscribe({
        next: (profile) => {
          if (profile) {
            const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
            if (!this.checkoutForm.get('clientName')?.value && fullName) {
              this.checkoutForm.patchValue({ clientName: fullName });
            }
            if (!this.checkoutForm.get('clientPhoneNumber')?.value && profile.phoneNumber) {
              this.checkoutForm.patchValue({ clientPhoneNumber: profile.phoneNumber });
            }
            if (!this.checkoutForm.get('customerEmail')?.value && profile.email) {
              this.checkoutForm.patchValue({ customerEmail: profile.email });
            }
          }
        }
      });
    }
  }

  private loadSavedAddresses(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.customerService.getCustomerProfile(userId).subscribe({
        next: (res) => {
          if (res && res.addresses && res.addresses.length > 0) {
            this.savedAddresses.set(res.addresses);
          }
        }
      });
    }
  }

  // ============================================
  // PASO 1: MAPBOX & UBICACIÓN (TIEMPO 1)
  // ============================================

  private async initMap(): Promise<void> {
    const container = document.getElementById('market-checkout-map');
    if (!container) return;

    (mapboxgl as any).accessToken = environment.mapbox.accessToken;

    let initLng = -77.03456;
    let initLat = -12.08542;

    try {
      // 1. Intentar consultar última ubicación guardada del cliente en el backend
      const lastLoc = await firstValueFrom(this.orderService.getLastLocation());
      if (lastLoc && lastLoc.latitude && lastLoc.longitude) {
        initLat = Number(lastLoc.latitude);
        initLng = Number(lastLoc.longitude);
        this.checkoutForm.patchValue({
          address: lastLoc.address || '',
          reference: lastLoc.reference || '',
          latitude: initLat,
          longitude: initLng,
          city: lastLoc.city || 'LIMA',
          district: lastLoc.district || ''
        });
      } else {
        // 2. Si no tiene historial (204 No Content), pedir GPS del navegador
        const coords = await this.getCurrentGpsPosition();
        if (coords) {
          initLat = coords.latitude;
          initLng = coords.longitude;
          this.checkoutForm.patchValue({
            latitude: initLat,
            longitude: initLng
          });
          // Reverse geocode inicial para la calle
          this.mapboxService.reverseGeocode(initLng, initLat).then(res => {
            if (res?.address && !this.checkoutForm.get('address')?.value) {
              this.checkoutForm.patchValue({ address: res.address, city: res.city || 'LIMA' });
            }
          });
        }
      }
    } catch {
      // Fallback a coordenadas por defecto de la ciudad
    }

    if (this.map) {
      this.map.remove();
    }

    this.map = new mapboxgl.Map({
      container: 'market-checkout-map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initLng, initLat],
      zoom: 15
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    this.marker = new mapboxgl.Marker({
      draggable: true,
      color: '#C30364'
    })
      .setLngLat([initLng, initLat])
      .addTo(this.map);

    // Eventos al arrastrar el pin
    this.marker.on('dragend', () => {
      const lngLat = this.marker?.getLngLat();
      if (lngLat) {
        this.onCoordinatesChanged(lngLat.lat, lngLat.lng);
      }
    });

    // Evento al hacer clic en el mapa
    this.map.on('click', (e) => {
      this.marker?.setLngLat(e.lngLat);
      this.onCoordinatesChanged(e.lngLat.lat, e.lngLat.lng);
    });
  }

  private onCoordinatesChanged(lat: number, lng: number): void {
    this.checkoutForm.patchValue({
      latitude: lat,
      longitude: lng
    });

    // Geocodificación inversa para sugerir el texto de la calle
    this.mapboxService.reverseGeocode(lng, lat).then(res => {
      if (res?.address) {
        this.checkoutForm.patchValue({
          address: res.address,
          city: res.city || 'LIMA'
        });
      }
    });
  }

  private getCurrentGpsPosition(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise(resolve => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            });
          },
          () => resolve(null),
          { timeout: 8000, enableHighAccuracy: true }
        );
      } else {
        resolve(null);
      }
    });
  }

  async centerOnDeviceGps(): Promise<void> {
    this.isLocatingGps.set(true);
    const coords = await this.getCurrentGpsPosition();
    this.isLocatingGps.set(false);

    if (coords && this.map && this.marker) {
      this.map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 16 });
      this.marker.setLngLat([coords.longitude, coords.latitude]);
      this.onCoordinatesChanged(coords.latitude, coords.longitude);
    }
  }

  applySavedAddress(addr: Address): void {
    this.selectedAddressId.set(addr.id || null);
    const lat = addr.latitude || -12.08542;
    const lng = addr.longitude || -77.03456;

    this.checkoutForm.patchValue({
      address: addr.streetAddress || addr.label || '',
      reference: addr.reference || '',
      latitude: lat,
      longitude: lng,
      city: addr.city || 'LIMA',
      district: addr.label || ''
    });

    if (this.map && this.marker) {
      this.map.flyTo({ center: [lng, lat], zoom: 16 });
      this.marker.setLngLat([lng, lat]);
    }
  }

  onAddressSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const addrId = Number(select.value);
    const addr = this.savedAddresses().find(a => a.id === addrId);
    if (addr) {
      this.applySavedAddress(addr);
    }
  }

  // ============================================
  // PASO 2: TRANSICIÓN A RESUMEN Y PAGO (TIEMPO 2)
  // ============================================

  goToStep2(): void {
    if (this.checkoutForm.get('address')?.invalid) {
      this.checkoutForm.get('address')?.markAsTouched();
      return;
    }

    const fv = this.checkoutForm.value;
    const location: MarketDeliveryLocationDto = {
      address: fv.address,
      reference: fv.reference?.trim() || undefined,
      latitude: fv.latitude,
      longitude: fv.longitude,
      city: fv.city || 'LIMA',
      district: fv.district?.trim() || undefined
    };

    this.isLoadingSummary.set(true);
    this.errorMessage.set(null);

    // Llamar al resumen con la ubicación exacta
    this.orderService.calculateSummary({ deliveryLocation: location, location }).subscribe({
      next: (summary) => {
        this.orderSummary.set(summary);
        this.isLoadingSummary.set(false);

        // Deshabilitar método de pago no permitido por la zona del cliente
        if (this.selectedPaymentMethod() === 'CASH_ON_DELIVERY' && summary.cashOnDeliveryEnabled === false) {
          this.selectedPaymentMethod.set('MANUAL_TRANSFER');
        } else if (this.selectedPaymentMethod() === 'MANUAL_TRANSFER' && summary.bankTransferEnabled === false) {
          this.selectedPaymentMethod.set('CASH_ON_DELIVERY');
        }

        this.currentStep.set(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.isLoadingSummary.set(false);
        const errMsg = err?.error?.message || 'Error al calcular costos de envío con el servidor.';
        this.errorMessage.set(errMsg);
      }
    });
  }

  goToStep1(): void {
    this.currentStep.set(1);
    setTimeout(() => this.initMap(), 150);
  }

  selectPaymentMethod(method: MarketPaymentMethod): void {
    const summary = this.orderSummary();
    if (method === 'CASH_ON_DELIVERY' && summary?.cashOnDeliveryEnabled === false) {
      return;
    }
    if (method === 'MANUAL_TRANSFER' && summary?.bankTransferEnabled === false) {
      return;
    }
    this.selectedPaymentMethod.set(method);
  }

  goBack(): void {
    if (this.currentStep() === 2) {
      this.goToStep1();
    } else {
      this.router.navigate(['/market/cart']);
    }
  }

  // ============================================
  // CONFIRMACIÓN FINAL: REALIZAR PEDIDO
  // ============================================

  onSubmitOrder(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    const fv = this.checkoutForm.value;
    const location: MarketDeliveryLocationDto = {
      address: fv.address,
      reference: fv.reference?.trim() || undefined,
      latitude: fv.latitude,
      longitude: fv.longitude,
      city: fv.city || 'LIMA',
      district: fv.district?.trim() || undefined
    };

    const request: MarketCheckoutRequest = {
      clientName: fv.clientName.trim(),
      clientPhoneNumber: fv.clientPhoneNumber.trim(),
      customerEmail: fv.customerEmail?.trim() || undefined,
      deliveryInstructions: fv.deliveryInstructions?.trim() || undefined,
      paymentMethod: this.selectedPaymentMethod(),
      deliveryLocation: location,
      location: location
    };

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.orderService.checkout(request).subscribe({
      next: (order) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/market/order', order.orderCode]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || 'No fue posible procesar tu orden. Por favor verifica los datos.';
        this.errorMessage.set(msg);
      }
    });
  }
}
