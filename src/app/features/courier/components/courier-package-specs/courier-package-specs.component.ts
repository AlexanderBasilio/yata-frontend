import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourierPackageSize, CourierPackageSpecs } from '../../models/courier.model';
import { COURIER_CONFIG } from '../../config/courier.config';

@Component({
  selector: 'app-courier-package-specs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './courier-package-specs.component.html',
  styleUrl: './courier-package-specs.component.scss'
})
export class CourierPackageSpecsComponent implements OnInit {
  readonly sizesConfig = COURIER_CONFIG.packageSizes;

  @Input() set initialSpecs(val: CourierPackageSpecs | null | undefined) {
    if (val) {
      this.specs.set({ ...val });
    }
  }

  @Output() specsChange = new EventEmitter<CourierPackageSpecs>();

  specs = signal<CourierPackageSpecs>({
    size: 'SMALL',
    quantity: 1,
    approxWeightKg: null,
    hasCustomDimensions: false,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    isFragile: false,
    fragilityDetail: '',
    canLeak: false,
    needsRefrigeration: false,
    hasAdequateContainer: false,
    isPurchaseAlreadyPaid: true,
    purchaseCoordinationNotes: '',
    description: ''
  });

  ngOnInit(): void {
    // Emitir estado inicial
    this.emitChange();
  }

  selectSize(size: CourierPackageSize): void {
    this.specs.update(s => ({
      ...s,
      size,
      // Si pasa a Grande, activar medidas por defecto
      hasCustomDimensions: size === 'LARGE' ? true : s.hasCustomDimensions
    }));
    this.emitChange();
  }

  incrementQuantity(): void {
    this.specs.update(s => ({
      ...s,
      quantity: s.quantity + 1
    }));
    this.emitChange();
  }

  decrementQuantity(): void {
    this.specs.update(s => ({
      ...s,
      quantity: Math.max(1, s.quantity - 1)
    }));
    this.emitChange();
  }

  onQuantityInput(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.specs.update(s => ({
      ...s,
      quantity: isNaN(val) || val < 1 ? 1 : val
    }));
    this.emitChange();
  }

  onWeightChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = parseFloat(raw);
    this.specs.update(s => ({
      ...s,
      approxWeightKg: isNaN(parsed) || parsed <= 0 ? null : parseFloat(parsed.toFixed(1))
    }));
    this.emitChange();
  }

  toggleDimensions(): void {
    this.specs.update(s => ({
      ...s,
      hasCustomDimensions: !s.hasCustomDimensions
    }));
    this.emitChange();
  }

  onDimensionChange(dimension: 'lengthCm' | 'widthCm' | 'heightCm', event: Event): void {
    const parsed = parseFloat((event.target as HTMLInputElement).value);
    this.specs.update(s => ({
      ...s,
      [dimension]: isNaN(parsed) || parsed <= 0 ? null : Math.round(parsed)
    }));
    this.emitChange();
  }

  setFragility(isFragile: boolean): void {
    this.specs.update(s => ({
      ...s,
      isFragile,
      fragilityDetail: isFragile ? s.fragilityDetail : ''
    }));
    this.emitChange();
  }

  onFragilityDetail(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.specs.update(s => ({
      ...s,
      fragilityDetail: val
    }));
    this.emitChange();
  }

  setLeakRisk(canLeak: boolean): void {
    this.specs.update(s => ({
      ...s,
      canLeak
    }));
    this.emitChange();
  }

  setRefrigeration(needsRefrigeration: boolean): void {
    this.specs.update(s => ({
      ...s,
      needsRefrigeration
    }));
    this.emitChange();
  }

  onDescriptionChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.specs.update(s => ({
      ...s,
      description: val
    }));
    this.emitChange();
  }

  private emitChange(): void {
    this.specsChange.emit(this.specs());
  }
}
