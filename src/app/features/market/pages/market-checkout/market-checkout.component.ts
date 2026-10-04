import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { CustomerService, Address } from '../../../../core/services/customer/customer.service';
import { MarketCartService } from '../../../../core/services/market/market-cart.service';
import { MarketOrderService } from '../../../../core/services/market/market-order.service';
import {
  MarketCheckoutPaymentMethod,
  MarketCheckoutRequest,
  MarketDeliveryLocationDto,
  MarketOrderSummaryResponse
} from '../../../../core/models/market.model';

@Component({
  selector: 'app-market-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './market-checkout.component.html',
  styleUrl: './market-checkout.component.scss'
})
export class MarketCheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public authService = inject(AuthService);
  public customerService = inject(CustomerService);
  public cartService = inject(MarketCartService);
  public orderService = inject(MarketOrderService);

  // Cart computed
  cart = computed(() => this.cartService.cart());

  // Checkout Form
  checkoutForm!: FormGroup;

  // Live order summary from backend
  orderSummary = signal<MarketOrderSummaryResponse | null>(null);
  isLoadingSummary = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Selected address state
  savedAddresses = signal<Address[]>([]);
  selectedAddressId = signal<number | null>(null);

  // Payment method options
  selectedPaymentMethod = signal<MarketCheckoutPaymentMethod>('MANUAL_TRANSFER');

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

  private initCheckout(): void {
    // 2. Construir formulario reactivo
    this.checkoutForm = this.fb.group({
      clientName: ['', [Validators.required, Validators.minLength(2)]],
      clientPhoneNumber: ['', [Validators.required]],
      customerEmail: ['', [Validators.email]],
      address: ['', [Validators.required, Validators.minLength(4)]],
      reference: [''],
      latitude: [-12.086421, [Validators.required]],
      longitude: [-77.034512, [Validators.required]],
      city: ['LIMA'],
      district: [''],
      deliveryInstructions: ['']
    });

    // 3. Autocompletar datos del cliente
    this.prefillCustomerData();

    // 4. Cargar direcciones del cliente
    this.loadCustomerAddresses();
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
        },
        error: () => {}
      });
    }
  }

  private loadCustomerAddresses(): void {
    const active = this.customerService.getActiveAddress();
    if (active && active.latitude && active.longitude) {
      this.applyAddress(active);
    }

    const userId = this.authService.getUserId();
    if (userId) {
      this.customerService.getCustomerProfile(userId).subscribe({
        next: (res) => {
          if (res && res.addresses && res.addresses.length > 0) {
            this.savedAddresses.set(res.addresses);
            if (!active) {
              const defaultAddr = res.addresses.find(a => a.isDefault) || res.addresses[0];
              this.applyAddress(defaultAddr);
            }
          } else if (active) {
            this.requestSummaryCalculation();
          } else {
            // Ubicación por defecto de Lima para cálculo inicial
            this.requestSummaryCalculation();
          }
        },
        error: () => {
          this.requestSummaryCalculation();
        }
      });
    } else {
      this.requestSummaryCalculation();
    }
  }

  applyAddress(addr: Address): void {
    this.selectedAddressId.set(addr.id || null);
    this.checkoutForm.patchValue({
      address: addr.streetAddress || addr.label || '',
      reference: addr.reference || '',
      latitude: addr.latitude || -12.086421,
      longitude: addr.longitude || -77.034512,
      city: addr.city || 'LIMA',
      district: addr.label || ''
    });

    this.requestSummaryCalculation();
  }

  onAddressSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const addrId = Number(select.value);
    const addr = this.savedAddresses().find(a => a.id === addrId);
    if (addr) {
      this.applyAddress(addr);
    }
  }

  requestSummaryCalculation(): void {
    const fv = this.checkoutForm.value;
    const location: MarketDeliveryLocationDto = {
      address: fv.address || 'Av. Principal',
      reference: fv.reference || undefined,
      latitude: fv.latitude || -12.086421,
      longitude: fv.longitude || -77.034512,
      city: fv.city || 'LIMA',
      district: fv.district || undefined
    };

    this.isLoadingSummary.set(true);
    this.errorMessage.set(null);

    this.orderService.calculateSummary({ deliveryLocation: location, location }).subscribe({
      next: (summary) => {
        this.orderSummary.set(summary);
        this.isLoadingSummary.set(false);

        // Si el método actual fue deshabilitado por zona, cambiar automáticamente al permitido
        if (this.selectedPaymentMethod() === 'CASH_ON_DELIVERY' && summary.cashOnDeliveryEnabled === false) {
          this.selectedPaymentMethod.set('MANUAL_TRANSFER');
        } else if (this.selectedPaymentMethod() === 'MANUAL_TRANSFER' && summary.bankTransferEnabled === false) {
          this.selectedPaymentMethod.set('CASH_ON_DELIVERY');
        }
      },
      error: (err) => {
        this.isLoadingSummary.set(false);
        const errMsg = err?.error?.message || 'Error al calcular costos de envío con el servidor.';
        this.errorMessage.set(errMsg);
      }
    });
  }

  selectPaymentMethod(method: MarketCheckoutPaymentMethod): void {
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
    this.router.navigate(['/market/cart']);
  }

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
        // Redirigir a la vista de confirmación y voucher del pedido de mercado
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
