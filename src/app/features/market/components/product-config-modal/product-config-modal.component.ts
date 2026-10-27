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
  MarketProductOptionGroupDto,
  MarketProductVariantDto,
  MarketStoreProductCustomerDto,
  MarketStoreProductPriceOfferDto,
  MeasurementType
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

  // 2. Ofertas de precio y unidades de venta activas
  activePrices = computed<MarketStoreProductPriceOfferDto[]>(() => {
    const v = this.selectedVariant();
    if (v?.prices && v.prices.length > 0) {
      return v.prices;
    }
    const prod = this.currentProduct() || this.product;
    return prod?.prices || [];
  });

  activeAllowedUnits = computed<MeasurementType[]>(() => {
    const v = this.selectedVariant();
    if (v?.allowedSaleUnits && v.allowedSaleUnits.length > 0) {
      return v.allowedSaleUnits;
    }
    const prod = this.currentProduct() || this.product;
    return prod?.allowedSaleUnits || [];
  });

  kgOffer = computed<MarketStoreProductPriceOfferDto | null>(() => {
    const prices = this.activePrices();
    if (prices.length > 0) {
      return prices.find(p => (p.saleUnit || p.measurementType) === 'KG') || null;
    }
    return null;
  });

  unitOffer = computed<MarketStoreProductPriceOfferDto | null>(() => {
    const prices = this.activePrices();
    if (prices.length > 0) {
      return prices.find(p => (p.saleUnit || p.measurementType) === 'UNIT') || null;
    }
    return null;
  });

  // Precios dinámicos reactivos de la variante actual o producto simple
  kgPrice = computed<number | null>(() => {
    const offer = this.kgOffer();
    if (offer) {
      return offer.zisifyPrice ?? offer.price ?? null;
    }

    const prices = this.activePrices();
    // Si la variante o el producto cuenta con array prices pero no incluye KG, NO se vende por KG
    if (prices.length > 0) {
      return null;
    }

    const allowed = this.activeAllowedUnits();
    // Si tiene allowedSaleUnits explícitos pero no incluye KG, NO se vende por KG
    if (allowed.length > 0) {
      if (!allowed.includes('KG')) {
        return null;
      }
      const v = this.selectedVariant();
      const prod = this.currentProduct() || this.product;
      return v?.price ?? prod?.pricePerKg ?? prod?.primaryPrice ?? prod?.price ?? null;
    }

    // Fallback únicamente para datos heredados sin array prices ni allowedSaleUnits
    const v = this.selectedVariant();
    const prod = this.currentProduct() || this.product;
    if (v) {
      if (v.saleUnit === 'KG' || v.priceUnit === 'KG') {
        return v.price ?? prod.primaryPrice ?? prod.price ?? null;
      }
      return null;
    }

    // Para productos simples sin variantes ni array prices:
    if (prod?.primaryPriceUnit === 'KG' || prod?.pricePerKg) {
      return prod.pricePerKg ?? prod.primaryPrice ?? prod.price ?? null;
    }
    return null;
  });

  unitPrice = computed<number | null>(() => {
    const offer = this.unitOffer();
    if (offer) {
      return offer.zisifyPrice ?? offer.price ?? null;
    }

    const prices = this.activePrices();
    // Si la variante o el producto cuenta con array prices pero no incluye UNIT, NO se vende por UNIT
    if (prices.length > 0) {
      return null;
    }

    const allowed = this.activeAllowedUnits();
    // Si tiene allowedSaleUnits explícitos pero no incluye UNIT, NO se vende por UNIT
    if (allowed.length > 0) {
      if (!allowed.includes('UNIT')) {
        return null;
      }
      const v = this.selectedVariant();
      const prod = this.currentProduct() || this.product;
      return v?.price ?? prod?.unitPrice ?? prod?.primaryPrice ?? prod?.price ?? null;
    }

    // Fallback únicamente para datos heredados sin array prices ni allowedSaleUnits
    const v = this.selectedVariant();
    const prod = this.currentProduct() || this.product;
    if (v) {
      if (v.saleUnit === 'UNIT' || v.priceUnit === 'UNIT' || !this.kgPrice()) {
        return v.price ?? prod.primaryPrice ?? prod.price ?? null;
      }
      return null;
    }

    // Para productos simples sin variantes ni array prices:
    if (prod?.primaryPriceUnit === 'UNIT' || prod?.unitPrice || !this.kgPrice()) {
      return prod.unitPrice ?? prod.primaryPrice ?? prod.price ?? null;
    }
    return null;
  });

  // 3. Incrementos dinámicos (weightStep y unitStep)
  weightStep = computed<number>(() => {
    const prod = this.currentProduct() || this.product;
    return prod?.weightStep || 0.5;
  });

  unitStep = computed<number>(() => {
    const prod = this.currentProduct() || this.product;
    return prod?.unitStep || 1;
  });

  currentStep = computed<number>(() => {
    return this.selectedUnit() === 'KG' ? this.weightStep() : this.unitStep();
  });

  stepSubtitle = computed<string>(() => {
    if (this.selectedUnit() === 'KG') {
      return `(Paso de ${this.weightStep()} kg)`;
    }
    return `(Paso de ${this.unitStep()} unidad)`;
  });

  // 4. Grupos y opciones habilitadas y disponibles para esta tienda específica
  availableOptionGroups = computed<MarketProductOptionGroupDto[]>(() => {
    const prod = this.currentProduct() || this.product;
    const list = prod?.optionGroups || [];
    return list
      .filter(g => g.isEnabled !== false && g.isAvailable !== false)
      .map(g => ({
        ...g,
        options: (g.options || []).filter(o => o.isEnabled !== false && o.isAvailable !== false)
      }))
      .filter(g => g.options.length > 0);
  });

  getOptionPrice(option: MarketProductOptionDto): number {
    return option.zisifyPrice ?? option.additionalPrice ?? 0;
  }

  // 5. Opciones de Modalidad de Venta para la variante actual
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

  // Opciones adicionales seleccionadas (usando zisifyPrice o additionalPrice de la tienda)
  optionsTotal = computed<number>(() => {
    const opts = Object.values(this.selectedOptionsMap());
    return opts.reduce((acc, curr) => acc + this.getOptionPrice(curr), 0);
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
    return this.selectedUnit() === 'KG';
  });

  // Validación
  isValid = computed<boolean>(() => {
    const variants = this.activeVariants();
    if (variants.length > 0 && !this.selectedVariant()) {
      return false;
    }
    const groups = this.availableOptionGroups();
    if (groups.length > 0) {
      for (const group of groups) {
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

    // 2. Establecer modalidad de venta inicial con incrementos dinámicos
    const units = this.availableSaleUnits();
    const defaultOffer = this.activePrices().find(p => p.isDefault);
    const defaultUnit = defaultOffer ? (defaultOffer.saleUnit || defaultOffer.measurementType) : null;
    const preferredUnit = defaultUnit || (units.some(u => u.unit === this.product.primaryPriceUnit) ? this.product.primaryPriceUnit : null);

    if (preferredUnit && units.some(u => u.unit === preferredUnit)) {
      this.selectSaleUnit(preferredUnit as 'KG' | 'UNIT');
    } else if (units.some(u => u.unit === 'KG')) {
      this.selectSaleUnit('KG');
    } else if (units.length > 0) {
      this.selectSaleUnit(units[0].unit);
    }

    // 3. Preseleccionar opciones por defecto de los grupos habilitados
    const groups = this.availableOptionGroups();
    if (groups.length > 0) {
      const initialMap: Record<string, MarketProductOptionDto> = {};
      groups.forEach(grp => {
        const defaultOpt =
          grp.options.find((o: MarketProductOptionDto) => o.isDefault) ||
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
          const available = this.availableSaleUnits();
          if (available.length > 0 && !available.some(u => u.unit === this.selectedUnit())) {
            this.selectSaleUnit(available[0].unit);
          } else if (this.quantity() < this.currentStep()) {
            this.quantity.set(this.currentStep());
          }
        }
      });
    }
  }

  selectVariant(variant: MarketProductVariantDto) {
    this.selectedVariant.set(variant);

    // Si la unidad seleccionada no está disponible en la nueva variante, cambiar a la 1ra disponible
    const available = this.availableSaleUnits();
    if (available.length > 0 && !available.some(u => u.unit === this.selectedUnit())) {
      this.selectSaleUnit(available[0].unit);
    }
  }

  selectSaleUnit(unit: 'KG' | 'UNIT') {
    this.selectedUnit.set(unit);
    if (unit === 'KG') {
      this.quantity.set(this.weightStep());
    } else {
      this.quantity.set(this.unitStep());
    }
  }

  increment() {
    const step = this.currentStep();
    this.quantity.update(q => parseFloat((q + step).toFixed(2)));
  }

  decrement() {
    const step = this.currentStep();
    this.quantity.update(q => {
      const next = parseFloat((q - step).toFixed(2));
      return next >= step ? next : step;
    });
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
        const groupObj = this.availableOptionGroups().find(g => g.id === groupId);
        const price = this.getOptionPrice(opt);
        return {
          groupId,
          groupName: groupObj?.name || 'Opciones',
          optionId: opt.id,
          name: opt.name,
          additionalPrice: price,
          zisifyPrice: opt.zisifyPrice ?? price
        };
      }
    );

    const request: AddMarketCartItemRequest = {
      storeId: this.storeId,
      productId: this.product.productId,
      variantId: this.selectedVariant()?.id,
      selectedMeasurement: this.selectedUnit(),
      quantity: this.quantity(),
      weightStep: this.weightStep(),
      unitStep: this.unitStep(),
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
