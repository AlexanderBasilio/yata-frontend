import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourierServiceType } from '../../models/courier.model';
import { COURIER_CONFIG } from '../../config/courier.config';

@Component({
  selector: 'app-courier-service-type',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './courier-service-type.component.html',
  styleUrl: './courier-service-type.component.scss'
})
export class CourierServiceTypeComponent implements OnInit {
  readonly servicesConfig = COURIER_CONFIG.serviceTypes;

  @Input() selectedType: CourierServiceType = 'PACKAGE';
  @Input() serviceTypeDetail = '';
  @Input() isPurchaseAlreadyPaid = true;
  @Input() purchaseCoordinationNotes = '';
  @Input() needsRefrigeration = false;
  @Input() hasAdequateContainer = false;

  @Output() typeChange = new EventEmitter<CourierServiceType>();
  @Output() detailChange = new EventEmitter<string>();
  @Output() purchasePaidChange = new EventEmitter<boolean>();
  @Output() purchaseNotesChange = new EventEmitter<string>();
  @Output() refrigerationChange = new EventEmitter<boolean>();
  @Output() containerChange = new EventEmitter<boolean>();

  currentType = signal<CourierServiceType>('PACKAGE');

  ngOnInit(): void {
    if (this.selectedType) {
      this.currentType.set(this.selectedType);
    }
  }

  selectType(type: CourierServiceType): void {
    this.currentType.set(type);
    this.typeChange.emit(type);

    // Ajustes automáticos sugeridos según el tipo de servicio
    if (type === 'FRESH_FOOD') {
      this.refrigerationChange.emit(true);
    }
  }

  onDetailInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.detailChange.emit(val);
  }

  setPurchasePaid(isPaid: boolean): void {
    this.purchasePaidChange.emit(isPaid);
  }

  onPurchaseNotes(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.purchaseNotesChange.emit(val);
  }

  setRefrigeration(needsRef: boolean): void {
    this.refrigerationChange.emit(needsRef);
  }

  setContainer(hasContainer: boolean): void {
    this.containerChange.emit(hasContainer);
  }
}
