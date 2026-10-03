import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AddMarketCartItemRequest,
  MarketProductOptionDto,
  MarketProductVariantDto,
  MarketStoreProductCustomerDto,
  MeasurementType
} from '../../../../core/models/market.model';

export interface SaleUnitOption {
  unit: 'KG' | 'UNIT';
  title: string;
  unitLabel: string;
  icon: string;
  price: number;
}

@Component({
  selector: 'app-product-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-config-modal.component.html',
  styleUrl: './product-config-modal.component.scss'
})
export class ProductConfigModalComponent implements OnInit {
  @Input({ required: true }) product!: MarketStoreProductCustomerDto;
  @Input({ required: true }) storeId!: string;
  @Input() initialVariantId?: string;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ request: AddMarketCartItemRequest; effectivePrice: number }>();

  // State signals
  selectedVariant = signal<MarketProductVariantDto | null>(null);
  selectedUnit = signal<'KG' | 'UNIT'>('KG');
  selectedOptionsMap = signal<Record<string, MarketProductOptionDto>>({});
  quantity = signal<number>(1);
  itemNotes = signal<string>('');

  // Precios dinámicos según la variante activa
  currentKgPrice = computed<number | null>(() => {
    const v = this.selectedVariant();
    // 1. Oferta de precio de la variante en KG
    const vOffer = v?.prices?.find(p => p.measurementType === 'KG');
    if (vOffer?.price) return vOffer.price;

    // 2. Oferta de precio del producto en KG
    const pOffer = this.product.prices?.find(p => p.measurementType === 'KG');
    if (pOffer?.price) return pOffer.price;

    // 3. Fallback precio por kilo
    if (this.product.pricePerKg) return this.product.pricePerKg;

    // 4. Si la unidad primaria es KG
    if (this.product.primaryPriceUnit === 'KG') {
      return v?.price || this.product.primaryPrice || this.product.price || null;
    }
    return null;
  });

  currentUnitPrice = computed<number | null>(() => {
    const v = this.selectedVariant();
    // 1. Oferta de precio de la variante en UNIT
    const vOffer = v?.prices?.find(p => p.measurementType === 'UNIT');
    if (vOffer?.price) return vOffer.price;

    // 2. Oferta de precio del producto en UNIT
    const pOffer = this.product.prices?.find(p => p.measurementType === 'UNIT');
    if (pOffer?.price) return pOffer.price;

    // 3. Fallback precio por unidad
    if (this.product.unitPrice) return this.product.unitPrice;

    // 4. Si la unidad primaria es UNIT
    if (this.product.primaryPriceUnit === 'UNIT') {
      return v?.price || this.product.primaryPrice || this.product.price || null;
    }

    // 5. Fallback si no tiene precio KG
    if (!this.currentKgPrice()) {
      return v?.price || this.product.primaryPrice || this.product.price || null;
    }
    return null;
  });

  // Lista de modalidades de venta disponibles para la variante actual
  availableSaleUnits = computed<SaleUnitOption[]>(() => {
    const options: SaleUnitOption[] = [];
    const kgPrice = this.currentKgPrice();
    const unitPrice = this.currentUnitPrice();

    if (kgPrice !== null && kgPrice !== undefined) {
      options.push({
        unit: 'KG',
        title: 'Por Kilo (KG)',
        unitLabel: '/ kg',
        icon: '⚖️',
        price: kgPrice
      });
    }

    if (unitPrice !== null && unitPrice !== undefined) {
      options.push({
        unit: 'UNIT',
        title: 'Por Unidad (UNID)',
        unitLabel: '/ unid',
        icon: '📦',
        price: unitPrice
      });
    }

    // Si por alguna razón ninguna coincide, crear una opción por defecto
    if (options.length === 0) {
      const fallbackUnit = this.product.primaryPriceUnit === 'KG' ? 'KG' : 'UNIT';
      options.push({
        unit: fallbackUnit,
        title: fallbackUnit === 'KG' ? 'Por Kilo (KG)' : 'Por Unidad (UNID)',
        unitLabel: fallbackUnit === 'KG' ? '/ kg' : '/ unid',
        icon: fallbackUnit === 'KG' ? '⚖️' : '📦',
        price: this.product.primaryPrice || this.product.price || 5.0
      });
    }

    return options;
  });

  // Precio base de la modalidad seleccionada
  basePrice = computed<number>(() => {
    const unit = this.selectedUnit();
    if (unit === 'KG') {
      return this.currentKgPrice() ?? this.product.primaryPrice ?? this.product.price ?? 5.0;
    }
    return this.currentUnitPrice() ?? this.product.primaryPrice ?? this.product.price ?? 5.0;
  });

  // Total de opciones adicionales
  optionsTotal = computed<number>(() => {
    const opts = Object.values(this.selectedOptionsMap());
    return opts.reduce((acc, curr) => acc + (curr.additionalPrice || 0), 0);
  });

  // Precio unitario efectivo
  effectiveUnitPrice = computed<number>(() => {
    return this.basePrice() + this.optionsTotal();
  });

  // Total a pagar = (Precio Variante y Unidad + Opciones) * Cantidad
  totalPrice = computed<number>(() => {
    return +(this.effectiveUnitPrice() * this.quantity()).toFixed(2);
  });

  // Determinar si aplica aviso de balanza (cuando la unidad es KG)
  isWeightActive = computed<boolean>(() => {
    return (
      this.selectedUnit() === 'KG' ||
      this.product.pricingMode === 'WEIGHT_BASED'
    );
  });

  // Validación para habilitar el botón de compra
  isValid = computed<boolean>(() => {
    // 1. Si el producto tiene variantes, debe tener una seleccionada
    if (this.product.variants && this.product.variants.length > 0 && !this.selectedVariant()) {
      return false;
    }
    // 2. Grupos de opciones obligatorios
    if (this.product.optionGroups && this.product.optionGroups.length > 0) {
      for (const group of this.product.optionGroups) {
        if (group.isRequired && !this.selectedOptionsMap()[group.id]) {
          return false;
        }
      }
    }
    // 3. Cantidad mayor a 0
    return this.quantity() > 0;
  });

  ngOnInit() {
    // 1. Preseleccionar variante (si se pasó initialVariantId o la 1ra)
    if (this.product.variants && this.product.variants.length > 0) {
      let variantToSelect: MarketProductVariantDto | null = null;
      if (this.initialVariantId) {
        variantToSelect = this.product.variants.find(v => v.id === this.initialVariantId) || null;
      }
      this.selectedVariant.set(variantToSelect || this.product.variants[0]);
    }

    // 2. Establecer modalidad de venta inicial (KG si está disponible, sino UNIT)
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
  }

  selectVariant(variant: MarketProductVariantDto) {
    this.selectedVariant.set(variant);

    // Si la unidad actualmente seleccionada no existe en la nueva variante, ajustar
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
