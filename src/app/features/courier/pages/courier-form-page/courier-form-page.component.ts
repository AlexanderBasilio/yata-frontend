import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourierQuoteFormState, CourierLocation, CourierPackageSpecs, CourierContacts, CourierSchedule, CourierServiceType } from '../../models/courier.model';
import { COURIER_CONFIG } from '../../config/courier.config';
import { CourierWhatsappService } from '../../services/courier-whatsapp.service';
import { CourierLocationSelectorComponent } from '../../components/courier-location-selector/courier-location-selector.component';
import { CourierPackageSpecsComponent } from '../../components/courier-package-specs/courier-package-specs.component';
import { CourierContactsComponent } from '../../components/courier-contacts/courier-contacts.component';
import { CourierScheduleComponent } from '../../components/courier-schedule/courier-schedule.component';
import { CourierSummaryComponent } from '../../components/courier-summary/courier-summary.component';
import { CourierServiceTypeComponent } from '../../components/courier-service-type/courier-service-type.component';

export interface FormStep {
  number: number;
  id: string;
  title: string;
  shortTitle: string;
  icon: string;
}

@Component({
  selector: 'app-courier-form-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CourierServiceTypeComponent,
    CourierLocationSelectorComponent,
    CourierPackageSpecsComponent,
    CourierContactsComponent,
    CourierScheduleComponent,
    CourierSummaryComponent
  ],
  templateUrl: './courier-form-page.component.html',
  styleUrl: './courier-form-page.component.scss'
})
export class CourierFormPageComponent implements OnInit {
  private whatsappService = inject(CourierWhatsappService);

  readonly config = COURIER_CONFIG;
  readonly logoUrl = 'https://res.cloudinary.com/dhgsvmcmc/image/upload/v1781978350/zisify-logo-red.png';

  steps: FormStep[] = [
    { number: 1, id: 'package', title: 'Paquete', shortTitle: 'Paquete', icon: '📦' },
    { number: 2, id: 'locations', title: 'Ubicaciones', shortTitle: 'Ruta', icon: '📍' },
    { number: 3, id: 'schedule', title: 'Contactos y Fecha', shortTitle: 'Datos', icon: '👤' },
    { number: 4, id: 'review', title: 'Resumen', shortTitle: 'Cotización', icon: '📋' }
  ];

  currentStepIndex = signal<number>(0);

  // Estado general de la solicitud de courier
  formState = signal<CourierQuoteFormState>({
    serviceType: 'PACKAGE',
    serviceTypeDetail: '',
    pickup: {
      address: '',
      reference: '',
      latitude: null,
      longitude: null,
      isConfirmedOnMap: false
    },
    delivery: {
      address: '',
      reference: '',
      latitude: null,
      longitude: null,
      isConfirmedOnMap: false
    },
    packageSpecs: {
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
    },
    contacts: {
      senderName: '',
      senderPhone: '',
      recipientName: '',
      recipientPhone: '',
      notes: ''
    },
    schedule: {
      date: '',
      dateLabel: '',
      window: COURIER_CONFIG.collectionWindow,
      isLateBooking: false,
      cutoffTimeNoticeAcknowledged: true
    }
  });

  // Validaciones reactivas paso a paso
  isStep1Valid = computed(() => {
    const s = this.formState();
    if (!s.serviceType) return false;
    if (s.packageSpecs.quantity < 1) return false;
    return true;
  });

  isStep2Valid = computed(() => {
    const s = this.formState();
    const hasPickup = !!s.pickup.address && s.pickup.address.trim().length > 3;
    const hasDelivery = !!s.delivery.address && s.delivery.address.trim().length > 3;
    return hasPickup && hasDelivery;
  });

  isStep3Valid = computed(() => {
    const s = this.formState();
    const hasSenderName = !!s.contacts.senderName && s.contacts.senderName.trim().length >= 2;
    const hasSenderPhone = !!s.contacts.senderPhone && this.isValidPhone(s.contacts.senderPhone);
    const hasRecipientName = !!s.contacts.recipientName && s.contacts.recipientName.trim().length >= 2;
    const hasRecipientPhone = !!s.contacts.recipientPhone && this.isValidPhone(s.contacts.recipientPhone);
    const hasDate = !!s.schedule.date;

    return hasSenderName && hasSenderPhone && hasRecipientName && hasRecipientPhone && hasDate;
  });

  isFormValid = computed(() => {
    return this.isStep1Valid() && this.isStep2Valid() && this.isStep3Valid();
  });

  // Lista detallada de campos pendientes para el resumen final
  validationErrors = computed(() => {
    const errs: string[] = [];
    const s = this.formState();

    if (!s.pickup.address || s.pickup.address.trim().length <= 3) {
      errs.push('Falta indicar la dirección de recojo.');
    }
    if (!s.delivery.address || s.delivery.address.trim().length <= 3) {
      errs.push('Falta indicar la dirección de entrega.');
    }
    if (!s.contacts.senderName || s.contacts.senderName.trim().length < 2) {
      errs.push('Falta el nombre de la persona en el punto de recojo.');
    }
    if (!s.contacts.senderPhone || !this.isValidPhone(s.contacts.senderPhone)) {
      errs.push('Falta o es incorrecto el teléfono de recojo.');
    }
    if (!s.contacts.recipientName || s.contacts.recipientName.trim().length < 2) {
      errs.push('Falta el nombre de la persona en el punto de entrega.');
    }
    if (!s.contacts.recipientPhone || !this.isValidPhone(s.contacts.recipientPhone)) {
      errs.push('Falta o es incorrecto el teléfono de entrega.');
    }
    if (!s.schedule.date) {
      errs.push('Falta seleccionar la fecha de recolección.');
    }

    return errs;
  });

  ngOnInit(): void {
    // Al cargar la página, asegurar vista arriba
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Navegación de pasos
  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStepIndex.set(index);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextStep(): void {
    const nextIdx = this.currentStepIndex() + 1;
    if (nextIdx < this.steps.length) {
      this.goToStep(nextIdx);
    }
  }

  prevStep(): void {
    const prevIdx = this.currentStepIndex() - 1;
    if (prevIdx >= 0) {
      this.goToStep(prevIdx);
    }
  }

  // Actualizaciones de estado
  onServiceTypeChange(type: CourierServiceType): void {
    this.formState.update(s => ({ ...s, serviceType: type }));
  }

  onServiceTypeDetailChange(detail: string): void {
    this.formState.update(s => ({ ...s, serviceTypeDetail: detail }));
  }

  onPurchasePaidChange(isPaid: boolean): void {
    this.formState.update(s => ({
      ...s,
      packageSpecs: { ...s.packageSpecs, isPurchaseAlreadyPaid: isPaid }
    }));
  }

  onPurchaseNotesChange(notes: string): void {
    this.formState.update(s => ({
      ...s,
      packageSpecs: { ...s.packageSpecs, purchaseCoordinationNotes: notes }
    }));
  }

  onRefrigerationChange(needsRef: boolean): void {
    this.formState.update(s => ({
      ...s,
      packageSpecs: { ...s.packageSpecs, needsRefrigeration: needsRef }
    }));
  }

  onContainerChange(hasContainer: boolean): void {
    this.formState.update(s => ({
      ...s,
      packageSpecs: { ...s.packageSpecs, hasAdequateContainer: hasContainer }
    }));
  }

  onPickupChange(loc: CourierLocation): void {
    this.formState.update(s => ({ ...s, pickup: { ...loc } }));
  }

  onDeliveryChange(loc: CourierLocation): void {
    this.formState.update(s => ({ ...s, delivery: { ...loc } }));
  }

  onPackageSpecsChange(specs: CourierPackageSpecs): void {
    this.formState.update(s => ({
      ...s,
      packageSpecs: { ...s.packageSpecs, ...specs }
    }));
  }

  onContactsChange(contacts: CourierContacts): void {
    this.formState.update(s => ({ ...s, contacts: { ...contacts } }));
  }

  onScheduleChange(schedule: CourierSchedule): void {
    this.formState.update(s => ({ ...s, schedule: { ...schedule } }));
  }

  // Apertura de WhatsApp
  submitToWhatsapp(): void {
    if (!this.isFormValid()) return;
    this.whatsappService.openWhatsapp(this.formState());
  }

  private isValidPhone(phone: string): boolean {
    const cleanDigits = phone.replace(/[\s\-+]/g, '');
    return /^\d{9,15}$/.test(cleanDigits);
  }
}
