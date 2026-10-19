import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketOrderService } from '../../../../core/services/market/market-order.service';
import {
  MarketOrderResponse,
  MarketPaymentAccountDto,
  MarketPaymentOperationRequest,
  ZoneResolutionResponse
} from '../../../../core/models/market.model';

export type PaymentSubStep = 'SELECT_METHOD' | 'TRANSFER_ACCOUNTS' | 'ENTER_OPERATION';

@Component({
  selector: 'app-market-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-payment.component.html',
  styleUrl: './market-payment.component.scss'
})
export class MarketPaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(MarketOrderService);

  orderCode = signal<string>('');
  order = signal<MarketOrderResponse | null>(null);
  zoneInfo = signal<ZoneResolutionResponse | null>(null);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Sub-step flow: SELECT_METHOD -> TRANSFER_ACCOUNTS -> ENTER_OPERATION
  subStep = signal<PaymentSubStep>('SELECT_METHOD');

  // Selected payment method: 'PREPAID' | 'CASH_ON_DELIVERY'
  selectedMethod = signal<'PREPAID' | 'CASH_ON_DELIVERY'>('PREPAID');

  // Accounts from backend (GET /api/market/customer/payment-accounts)
  paymentAccounts = signal<MarketPaymentAccountDto[]>([]);
  isLoadingAccounts = signal<boolean>(false);
  selectedAccount = signal<MarketPaymentAccountDto | null>(null);

  // Clipboard & feedback
  copiedAccountId = signal<string | null>(null);
  copyToast = signal<string | null>(null);

  // Step 3 operation input
  operationNumber = signal<string>('');
  paymentAccountUsed = signal<string>('Yape Zisify');

  // Computed availability from order or zone
  isPrepaidEnabled = computed(() => {
    const o = this.order();
    if (o && o.prepaidEnabled !== undefined) {
      return o.prepaidEnabled !== false && o.bankTransferEnabled !== false;
    }
    const zone = this.zoneInfo();
    if (!zone) return true;
    return zone.prepaidEnabled !== false && zone.bankTransferEnabled !== false;
  });

  isCashOnDeliveryEnabled = computed(() => {
    const o = this.order();
    if (o && o.cashOnDeliveryEnabled !== undefined) {
      return o.cashOnDeliveryEnabled === true;
    }
    const zone = this.zoneInfo();
    if (!zone) return true;
    return zone.cashOnDeliveryEnabled === true;
  });

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('orderCode') || '';
    this.orderCode.set(code);

    if (!code) {
      this.errorMessage.set('No se encontró el código de orden.');
      this.isLoading.set(false);
      return;
    }

    // Check query params for initial step
    const stepParam = this.route.snapshot.queryParamMap.get('step');
    if (stepParam === 'accounts') {
      this.subStep.set('TRANSFER_ACCOUNTS');
    } else if (stepParam === 'operation') {
      this.subStep.set('ENTER_OPERATION');
    }

    this.loadOrderAndZone(code);
    this.loadPaymentAccounts();
  }

  private loadOrderAndZone(code: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.orderService.getOrderByCode(code).subscribe({
      next: (order) => {
        if (!order) {
          this.errorMessage.set(`No se pudo cargar la información de la orden ${code}.`);
          this.isLoading.set(false);
          return;
        }

        this.order.set(order);

        // Si la orden ya está confirmada o en verificación, redirigir a la pantalla de confirmación
        if (order.status === 'CONFIRMED' || order.status === 'PAYMENT_VERIFICATION') {
          this.router.navigate(['/market/order', code]);
          return;
        }

        // Si la orden ya está en PENDING_PAYMENT y no se pasó step explícito, ir a cuentas
        if (order.status === 'PENDING_PAYMENT' && !this.route.snapshot.queryParamMap.get('step')) {
          this.subStep.set('TRANSFER_ACCOUNTS');
        }

        // Si el backend ya incluye flags de zona en la orden, usarlos
        if (order.cashOnDeliveryEnabled !== undefined) {
          if (!order.cashOnDeliveryEnabled && this.selectedMethod() === 'CASH_ON_DELIVERY') {
            this.selectedMethod.set('PREPAID');
          }
          this.isLoading.set(false);
          return;
        }

        // Fallback: resolver zona en Platform si hay ubicación
        const loc = order.deliveryLocation || order.location;
        if (loc?.latitude && loc?.longitude) {
          this.orderService.resolveZoneLocation(loc.latitude, loc.longitude).subscribe({
            next: (zone) => {
              this.zoneInfo.set(zone);
              if (zone.cashOnDeliveryEnabled === false && this.selectedMethod() === 'CASH_ON_DELIVERY') {
                this.selectedMethod.set('PREPAID');
              }
              this.isLoading.set(false);
            },
            error: () => {
              this.isLoading.set(false);
            }
          });
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Error al consultar la orden.');
      }
    });
  }

  private loadPaymentAccounts(): void {
    this.isLoadingAccounts.set(true);
    this.orderService.getPaymentAccounts().subscribe({
      next: (accounts) => {
        this.isLoadingAccounts.set(false);
        if (accounts && accounts.length > 0) {
          this.paymentAccounts.set(accounts);
          this.selectedAccount.set(accounts[0]);
          this.paymentAccountUsed.set(accounts[0].accountName);
        } else {
          // Fallback con cuentas oficiales si el backend no tuviera ninguna cargada
          const defaultAccounts: MarketPaymentAccountDto[] = [
            {
              id: 'acc-yape-1',
              type: 'YAPE',
              accountName: 'Yape Zisify',
              accountNumber: '911199922',
              accountHolder: 'Zisify SAC',
              isAvailable: true,
              displayOrder: 1,
              instructions: 'Escanea el QR o copia el número y transfiere el monto exacto.'
            },
            {
              id: 'acc-plin-2',
              type: 'PLIN',
              accountName: 'Plin Zisify',
              accountNumber: '987654321',
              accountHolder: 'Zisify SAC',
              isAvailable: true,
              displayOrder: 2,
              instructions: 'Transfiere desde tu app bancaria con Plin al número indicado.'
            }
          ];
          this.paymentAccounts.set(defaultAccounts);
          this.selectedAccount.set(defaultAccounts[0]);
          this.paymentAccountUsed.set(defaultAccounts[0].accountName);
        }
      },
      error: () => {
        this.isLoadingAccounts.set(false);
      }
    });
  }

  selectMethod(method: 'PREPAID' | 'CASH_ON_DELIVERY'): void {
    if (method === 'CASH_ON_DELIVERY' && !this.isCashOnDeliveryEnabled()) {
      return;
    }
    this.selectedMethod.set(method);
  }

  // ============================================
  // PASO 1: CONFIRMAR MÉTODO DE PAGO
  // ============================================
  confirmPaymentMethod(): void {
    const code = this.orderCode();
    if (!code) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const method = this.selectedMethod();

    if (method === 'CASH_ON_DELIVERY') {
      // Camino B: Contra-entrega -> PATCH paymentMethod: CASH_ON_DELIVERY -> CONFIRMED
      this.orderService.updatePaymentMethod(code, 'CASH_ON_DELIVERY').subscribe({
        next: () => {
          this.isSubmitting.set(false);
          // Redirige directamente a la Pantalla de Confirmación Exitosa
          this.router.navigate(['/market/order', code]);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            err?.error?.message || 'No fue posible registrar el método Contra-entrega. Intenta nuevamente.'
          );
        }
      });
    } else {
      // Camino A: Pago Anticipado -> PATCH paymentMethod: PREPAID -> PENDING_PAYMENT
      this.orderService.updatePaymentMethod(code, 'PREPAID').subscribe({
        next: () => {
          this.isSubmitting.set(false);
          // Navega inmediatamente a la pantalla de Cuentas de Transferencia
          this.setSubStep('TRANSFER_ACCOUNTS');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            err?.error?.message || 'No fue posible registrar la selección de Pago Anticipado.'
          );
        }
      });
    }
  }

  // ============================================
  // PASO A.2: CUENTAS DE TRANSFERENCIA
  // ============================================
  copyAccountNumber(account: MarketPaymentAccountDto): void {
    if (!account.accountNumber) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(account.accountNumber).then(() => {
        this.copiedAccountId.set(account.id);
        this.selectedAccount.set(account);
        this.paymentAccountUsed.set(account.accountName);
        this.copyToast.set(`¡Número copiado! Pégalo en tu ${account.type === 'PLIN' ? 'Plin' : 'Yape'}`);

        setTimeout(() => {
          if (this.copiedAccountId() === account.id) {
            this.copiedAccountId.set(null);
            this.copyToast.set(null);
          }
        }, 3000);
      }).catch(err => {
        console.warn('Error al copiar número:', err);
      });
    }
  }

  selectAccount(account: MarketPaymentAccountDto): void {
    this.selectedAccount.set(account);
    this.paymentAccountUsed.set(account.accountName);
  }

  proceedToEnterOperation(): void {
    this.setSubStep('ENTER_OPERATION');
  }

  // ============================================
  // PASO A.3: REGISTRO DE NÚMERO DE OPERACIÓN
  // ============================================
  submitOperationNumber(): void {
    const code = this.orderCode();
    const opNumber = this.operationNumber().trim();

    if (!code) return;

    if (!opNumber || opNumber.length < 4) {
      this.errorMessage.set('Por favor ingresa un número o código de operación válido (mínimo 4 dígitos).');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: MarketPaymentOperationRequest = {
      operationNumber: opNumber,
      paymentAccountUsed: this.paymentAccountUsed() || 'Yape Zisify',
      voucherImageUrl: null
    };

    this.orderService.registerPaymentOperation(code, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        // Redirige a la Pantalla de Confirmación / En Verificación
        this.router.navigate(['/market/order', code]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Error al registrar tu número de operación. Verifica el dato e intenta nuevamente.'
        );
      }
    });
  }

  setSubStep(step: PaymentSubStep): void {
    this.subStep.set(step);
    this.errorMessage.set(null);
    let stepQuery = 'select-method';
    if (step === 'TRANSFER_ACCOUNTS') stepQuery = 'accounts';
    if (step === 'ENTER_OPERATION') stepQuery = 'operation';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: stepQuery },
      queryParamsHandling: 'merge'
    });
  }

  goBackToCatalog(): void {
    this.router.navigate(['/market']);
  }
}
