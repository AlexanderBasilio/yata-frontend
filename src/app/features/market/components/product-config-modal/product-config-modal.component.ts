import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AddMarketCartItemRequest,
  MarketProductOptionDto,
  MarketProductVariantDto,
  MarketStoreProductCustomerDto,
  MarketStoreProductPriceOfferDto
} from '../../../../core/models/market.model';
import { MarketCatalogService } from '../../../../core/services/market/market-catalog.service';

export interface SaleUnitOption {
  unit: 'KG' | 'UNIT';
  title: string;
  unitLabel: string;
  icon: string;
  price: number;
  referenceLabel?: string;
}

@Component({
  selector: 'app-product-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-config-modal.component.html',
  styleUrl: './product-config-modal.component.scss'
})
export class ProductConfigModalComponent implements OnInit {
  private catalogService = inject(MarketCatalogService);
  private _inputProduct!: MarketStoreProductCustomerDto;
  currentProduct = signal<MarketStoreProductCustomerDto | null>(null);

  @Input({ required: true })
  set product(val: MarketStoreProductCustomerDto) {
    this._inputProduct = val;
    this.currentProduct.set(val);
  }
  get product(): MarketStoreProductCustomerDto {
    return this.currentProduct() || this._inputProduct;
  }

  @Input({ required: true }) storeId!: string;
  @Input() initialVariantId?: string;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ request: AddMarketCartItemRequest; effectivePrice: number }>();

  // 1. Variantes activas únicamente (filtrando las no activas para evitar opciones como Tangelo si el puesto no las vende)
  activeVariants = computed<MarketProductVariantDto[]>(() => {
    const prod = this.currentProduct() || this.product;
    const list = prod?.variants || [];
    return list.filter(v => v.isActive !== false && v.isAvailable !== false);
  });

  // Estado reactivo del modal
  selectedVariant = signal<MarketProductVariantDto | null>(null);
  selectedUnit = signal<'KG' | 'UNIT'>('KG');
  quantity = signal<number>(1);
  selectedOptionsMap = signal<Record<string, MarketProductOptionDto>>({});
  itemNotes = signal<string>('');

  // 2. Ofertas de precio de la variante seleccionada
  kgOffer = computed<MarketStoreProductPriceOfferDto | null>(() => {
    const v = this.selectedVariant();
    if (v?.prices && v.prices.length > 0) {
      return v.prices.find(p => (p.saleUnit || p.measurementType) === 'KG') || null;
    }
    const prod = this.currentProduct() || this.product;
    return prod?.prices?.find(p => (p.saleUnit || p.measurementType) === 'KG') || null;
  });

  unitOffer = computed<MarketStoreProductPriceOfferDto | null>(() => {
    const v = this.selectedVariant();
    if (v?.prices && v.prices.length > 0) {
      return v.prices.find(p => (p.saleUnit || p.measurementType) === 'UNIT') || null;
    }
    const prod = this.currentProduct() || this.product;
    return prod?.prices?.find(p => (p.saleUnit || p.measurementType) === 'UNIT') || null;
  });

  // Precios dinámicos reactivos de la variante actual
  kgPrice = computed<number | null>(() => {
    const offer = this.kgOffer();
    if (offer) {
      return offer.zisifyPrice ?? offer.price ?? null;
    }
    // Si la variante tiene lista de precios pero no incluye KG, esta variante no se vende por KG
    if (this.selectedVariant()?.prices && this.selectedVariant()!.prices!.length > 0) {
      return null;
    }
    const prod = this.currentProduct() || this.product;
    // Fallback únicamente para productos simples sin variantes o sin lista prices
    const pOffer = prod?.prices?.find(p => (p.saleUnit || p.measurementType) === 'KG');
    if (pOffer) return pOffer.zisifyPrice ?? pOffer.price ?? null;
    if (prod?.pricePerKg) return prod.pricePerKg;
    if (prod?.primaryPriceUnit === 'KG') {
      return this.selectedVariant()?.price ?? prod.primaryPrice ?? prod.price ?? null;
    }
    return null;
  });

  unitPrice = computed<number | null>(() => {
    const offer = this.unitOffer();
    if (offer) {
      return offer.zisifyPrice ?? offer.price ?? null;
    }
    // Si la variante tiene lista de precios pero no incluye UNIT, esta variante no se vende por UNIT
    if (this.selectedVariant()?.prices && this.selectedVariant()!.prices!.length > 0) {
      return null;
    }
    const prod = this.currentProduct() || this.product;
    // Fallback únicamente para productos simples sin variantes o sin lista prices
    const pOffer = prod?.prices?.find(p => (p.saleUnit || p.measurementType) === 'UNIT');
    if (pOffer) return pOffer.zisifyPrice ?? pOffer.price ?? null;
    if (prod?.unitPrice) return prod.unitPrice;
    if (prod?.primaryPriceUnit === 'UNIT') {
      return this.selectedVariant()?.price ?? prod.primaryPrice ?? prod.price ?? null;
    }
    if (!this.kgPrice()) {
      return this.selectedVariant()?.price ?? prod.primaryPrice ?? prod.price ?? null;
    }
    return null;
  });

  // 3. Opciones de Modalidad de Venta para la variante actual
  availableSaleUnits = computed<SaleUnitOption[]>(() => {
    const options: SaleUnitOption[] = [];
    const kg = this.kgPrice();
    const unit = this.unitPrice();

    if (kg !== null && kg !== undefined) {
      options.push({
        unit: 'KG',
        title: 'Por Kilo (KG)',
        unitLabel: '/ kg',
        icon: '⚖️',
        price: kg
      });
    }

    if (unit !== null && unit !== undefined) {
      let refText: string | undefined = undefined;
      const offer = this.unitOffer();
      const prod = this.currentProduct() || this.product;
      const pricePerKg =
        offer?.zisifyPricePerKg ??
        this.kgPrice() ??
        (prod.primaryPriceUnit === 'KG' || prod.priceUnit === 'KG'
          ? (prod.pricePerKg ?? prod.primaryPrice)
          : undefined);
      const avgGrams =
        offer?.estimatedAverageWeightGrams ??
        this.selectedVariant()?.weightAverageGrams ??
        this.selectedVariant()?.weightGrams ??
        prod.weightGrams;

      if (pricePerKg && avgGrams) {
        const weightKg = avgGrams / 1000;
        const weightText = weightKg >= 1 ? `~${weightKg.toFixed(1)} kg` : `~${avgGrams}g`;
        if (weightKg >= 1) {
          refText = `Tarifa: S/ ${pricePerKg.toFixed(2)} / kg (${weightText} aprox.)`;
        } else {
          refText = `Ref: ${weightText} (S/ ${pricePerKg.toFixed(2)} / kg)`;
        }
      } else if (pricePerKg) {
        refText = `Tarifa: S/ ${pricePerKg.toFixed(2)} / kg`;
      }

      options.push({
        unit: 'UNIT',
        title: 'Por Unidad (UNID)',
        unitLabel: '/ unid',
        icon: '🍊',
        price: unit,
        referenceLabel: refText
      });
    }

    if (options.length === 0) {
      const fallbackUnit = this.product.primaryPriceUnit === 'KG' ? 'KG' : 'UNIT';
      options.push({
        unit: fallbackUnit,
        title: fallbackUnit === 'KG' ? 'Por Kilo (KG)' : 'Por Unidad (UNID)',
        unitLabel: fallbackUnit === 'KG' ? '/ kg' : '/ unid',
        icon: fallbackUnit === 'KG' ? '⚖️' : '🍊',
        price: this.product.primaryPrice ?? this.product.price ?? 5.0
      });
    }

    return options;
  });

  // Precio base de la modalidad seleccionada
  basePrice = computed<number>(() => {
    const unit = this.selectedUnit();
    if (unit === 'KG') {
      return this.kgPrice() ?? this.product.primaryPrice ?? this.product.price ?? 5.0;
    }
    return this.unitPrice() ?? this.product.primaryPrice ?? this.product.price ?? 5.0;
  });

  // Opciones adicionales seleccionadas
  optionsTotal = computed<number>(() => {
    const opts = Object.values(this.selectedOptionsMap());
    return opts.reduce((acc, curr) => acc + (curr.additionalPrice || 0), 0);
  });

  // Precio unitario efectivo
  effectiveUnitPrice = computed<number>(() => {
    return this.basePrice() + this.optionsTotal();
  });

  // Total a pagar reactivo: (unitPrice + totalOpcionesAdicionales) * quantity
  totalPrice = computed<number>(() => {
    return +(this.effectiveUnitPrice() * this.quantity()).toFixed(2);
  });

  // Aviso de balanza si está en KG
  isWeightActive = computed<boolean>(() => {
    return this.selectedUnit() === 'KG' || this.product.pricingMode === 'WEIGHT_BASED';
  });

  // Validación
  isValid = computed<boolean>(() => {
    const variants = this.activeVariants();
    if (variants.length > 0 && !this.selectedVariant()) {
      return false;
    }
    if (this.product.optionGroups && this.product.optionGroups.length > 0) {
      for (const group of this.product.optionGroups) {
        if (group.isRequired && !this.selectedOptionsMap()[group.id]) {
          return false;
        }
      }
    }
    return this.quantity() > 0;
  });

  ngOnInit() {
    // 1. Preseleccionar variante activa
    const variants = this.activeVariants();
    if (variants.length > 0) {
      let variantToSelect: MarketProductVariantDto | null = null;
      if (this.initialVariantId) {
        variantToSelect = variants.find(v => v.id === this.initialVariantId) || null;
      }
      this.selectedVariant.set(variantToSelect || variants[0]);
    }

    // 2. Establecer modalidad de venta inicial
    const units = this.availableSaleUnits();
    if (units.some(u => u.unit === 'KG')) {
      this.selectedUnit.set('KG');
      this.quantity.set(1.0);
    } else {
      this.selectedUnit.set('UNIT');
      this.quantity.set(1);
    }

    // 3. Preseleccionar opciones por defecto
    if (this.product.optionGroups) {
      const initialMap: Record<string, MarketProductOptionDto> = {};
      this.product.optionGroups.forEach(grp => {
        const defaultOpt =
          grp.options.find(o => o.isDefault) ||
          (grp.isRequired ? grp.options[0] : null);
        if (defaultOpt) {
          initialMap[grp.id] = defaultOpt;
        }
      });
      this.selectedOptionsMap.set(initialMap);
    }

    // 4. Refrescar detalles y ofertas actualizadas desde el nuevo endpoint individual
    if (this.storeId && this.product?.productId) {
      this.catalogService.getProductDetail(this.storeId, this.product.productId).subscribe(fresh => {
        if (fresh) {
          this.currentProduct.set(fresh);
          const currentVarId = this.selectedVariant()?.id;
          if (currentVarId && fresh.variants) {
            const updatedVar = fresh.variants.find(v => v.id === currentVarId);
            if (updatedVar) {
              this.selectedVariant.set(updatedVar);
            }
          }
        }
      });
    }
  }

  selectVariant(variant: MarketProductVariantDto) {
    this.selectedVariant.set(variant);

    // Si la unidad seleccionada no está disponible en la nueva variante, cambiar a la 1ra disponible
    const available = this.availableSaleUnits();
    if (!available.some(u => u.unit === this.selectedUnit())) {
      this.selectSaleUnit(available[0].unit);
    }
  }

  selectSaleUnit(unit: 'KG' | 'UNIT') {
    this.selectedUnit.set(unit);
    if (unit === 'KG') {
      this.quantity.set(1.0);
    } else {
      this.quantity.set(1);
    }
  }

  increment() {
    if (this.selectedUnit() === 'KG') {
      this.quantity.update(q => +(q + 0.5).toFixed(1));
    } else {
      this.quantity.update(q => q + 1);
    }
  }

  decrement() {
    if (this.selectedUnit() === 'KG') {
      this.quantity.update(q => (q > 0.5 ? +(q - 0.5).toFixed(1) : 0.5));
    } else {
      this.quantity.update(q => (q > 1 ? q - 1 : 1));
    }
  }

  selectOption(groupId: string, option: MarketProductOptionDto) {
    this.selectedOptionsMap.update(map => ({
      ...map,
      [groupId]: option
    }));
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onSubmit() {
    if (!this.isValid()) return;

    const selectedOptionsList = Object.entries(this.selectedOptionsMap()).map(
      ([groupId, opt]) => {
        const groupObj = this.product.optionGroups?.find(g => g.id === groupId);
        return {
          groupId,
          groupName: groupObj?.name || 'Opciones',
          optionId: opt.id,
          name: opt.name,
          additionalPrice: opt.additionalPrice || 0
        };
      }
    );

    const request: AddMarketCartItemRequest = {
      storeId: this.storeId,
      productId: this.product.productId,
      variantId: this.selectedVariant()?.id,
      selectedMeasurement: this.selectedUnit(),
      quantity: this.quantity(),
      selectedOptionsJson:
        selectedOptionsList.length > 0
          ? JSON.stringify(selectedOptionsList)
          : undefined,
      optionsAdditionalPrice: this.optionsTotal(),
      itemNotes: this.itemNotes().trim() || undefined
    };

    this.confirm.emit({
      request,
      effectivePrice: this.effectiveUnitPrice()
    });
  }
}
