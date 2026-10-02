import { Component, EventEmitter, Input, Output, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AddMarketCartItemRequest,
  MarketProductOptionDto,
  MarketProductVariantDto,
  MarketStoreProductCustomerDto
} from '../../../../core/models/market.model';

@Component({
  selector: 'app-product-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-config-modal.component.html'
})
export class ProductConfigModalComponent implements OnInit {
  @Input({ required: true }) product!: MarketStoreProductCustomerDto;
  @Input({ required: true }) storeId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ request: AddMarketCartItemRequest; effectivePrice: number }>();

  // State signals
  selectedVariant = signal<MarketProductVariantDto | null>(null);
  selectedOptionsMap = signal<Record<string, MarketProductOptionDto>>({});
  quantity = signal<number>(1);
  itemNotes = signal<string>('');

  // Is weight based
  isWeightBased = computed(() => {
    return (
      this.product?.pricingMode === 'WEIGHT_BASED' ||
      this.product?.measurementType === 'KG' ||
      this.product?.primaryPriceUnit === 'KG'
    );
  });

  // Effective base price
  basePrice = computed(() => {
    if (this.selectedVariant()?.price) {
      return this.selectedVariant()!.price!;
    }
    return this.product?.primaryPrice ?? this.product?.price ?? 5.0;
  });

  // Additional options price
  optionsTotal = computed(() => {
    const opts = Object.values(this.selectedOptionsMap());
    return opts.reduce((acc, curr) => acc + (curr.additionalPrice || 0), 0);
  });

  // Total unit price
  unitPrice = computed(() => {
    return this.basePrice() + this.optionsTotal();
  });

  // Grand total for selected quantity
  totalPrice = computed(() => {
    return this.unitPrice() * this.quantity();
  });

  // Validation
  isValid = computed(() => {
    // 1. Variant requirement
    if (this.product.variants && this.product.variants.length > 0 && !this.selectedVariant()) {
      return false;
    }
    // 2. Required option groups
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
    // Auto select first variant if available
    if (this.product.variants && this.product.variants.length > 0) {
      this.selectedVariant.set(this.product.variants[0]);
    }
    // Auto select default options if defined
    if (this.product.optionGroups) {
      const initialMap: Record<string, MarketProductOptionDto> = {};
      this.product.optionGroups.forEach(grp => {
        const defaultOpt = grp.options.find(o => o.isDefault) || (grp.isRequired ? grp.options[0] : null);
        if (defaultOpt) {
          initialMap[grp.id] = defaultOpt;
        }
      });
      this.selectedOptionsMap.set(initialMap);
    }
  }

  selectVariant(variant: MarketProductVariantDto) {
    this.selectedVariant.set(variant);
  }

  selectOption(groupId: string, option: MarketProductOptionDto) {
    this.selectedOptionsMap.update(map => ({
      ...map,
      [groupId]: option
    }));
  }

  increment() {
    this.quantity.update(q => (this.isWeightBased() ? +(q + 0.5).toFixed(1) : q + 1));
  }

  decrement() {
    const min = this.isWeightBased() ? 0.5 : 1;
    this.quantity.update(q => (q > min ? (this.isWeightBased() ? +(q - 0.5).toFixed(1) : q - 1) : min));
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onSubmit() {
    if (!this.isValid()) return;

    const selectedOptionsList = Object.entries(this.selectedOptionsMap()).map(([groupId, opt]) => {
      const groupObj = this.product.optionGroups?.find(g => g.id === groupId);
      return {
        groupId,
        groupName: groupObj?.name || 'Opciones',
        optionId: opt.id,
        name: opt.name,
        additionalPrice: opt.additionalPrice || 0
      };
    });

    const request: AddMarketCartItemRequest = {
      storeId: this.storeId,
      productId: this.product.productId,
      variantId: this.selectedVariant()?.id,
      selectedMeasurement: this.isWeightBased() ? 'KG' : 'UNIT',
      quantity: this.quantity(),
      selectedOptionsJson: selectedOptionsList.length > 0 ? JSON.stringify(selectedOptionsList) : undefined,
      optionsAdditionalPrice: this.optionsTotal(),
      itemNotes: this.itemNotes().trim() || undefined
    };

    this.confirm.emit({
      request,
      effectivePrice: this.unitPrice()
    });
  }
}
