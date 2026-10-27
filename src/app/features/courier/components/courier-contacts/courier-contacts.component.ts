import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourierContacts } from '../../models/courier.model';

@Component({
  selector: 'app-courier-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './courier-contacts.component.html',
  styleUrl: './courier-contacts.component.scss'
})
export class CourierContactsComponent implements OnInit {
  @Input() set initialContacts(val: CourierContacts | null | undefined) {
    if (val) {
      this.contacts.set({ ...val });
    }
  }

  @Output() contactsChange = new EventEmitter<CourierContacts>();

  contacts = signal<CourierContacts>({
    senderName: '',
    senderPhone: '',
    recipientName: '',
    recipientPhone: '',
    notes: ''
  });

  senderPhoneError = signal<string | null>(null);
  recipientPhoneError = signal<string | null>(null);

  ngOnInit(): void {
    this.emitChange();
  }

  onSenderNameChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.contacts.update(c => ({ ...c, senderName: val }));
    this.emitChange();
  }

  onSenderPhoneChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.contacts.update(c => ({ ...c, senderPhone: val }));
    this.senderPhoneError.set(this.validatePhone(val));
    this.emitChange();
  }

  onRecipientNameChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.contacts.update(c => ({ ...c, recipientName: val }));
    this.emitChange();
  }

  onRecipientPhoneChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.contacts.update(c => ({ ...c, recipientPhone: val }));
    this.recipientPhoneError.set(this.validatePhone(val));
    this.emitChange();
  }

  onNotesChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.contacts.update(c => ({ ...c, notes: val }));
    this.emitChange();
  }

  /**
   * Validación razonable de número telefónico (Perú o internacional)
   */
  private validatePhone(phone: string): string | null {
    const trimmed = phone.trim();
    if (!trimmed) {
      return null; // El validador de requerido se maneja en el formulario principal
    }
    // Acepta formato peruano estándar 9XXXXXXXX, o con prefijo +519XXXXXXXX, o internacional entre 8 y 15 dígitos
    const cleanDigits = trimmed.replace(/[\s\-+]/g, '');
    if (!/^\d+$/.test(cleanDigits)) {
      return 'Ingresa solo números telefónicos válidos.';
    }
    if (cleanDigits.length < 9 || cleanDigits.length > 15) {
      return 'El teléfono debe tener entre 9 y 15 dígitos.';
    }
    return null;
  }

  private emitChange(): void {
    this.contactsChange.emit(this.contacts());
  }
}
