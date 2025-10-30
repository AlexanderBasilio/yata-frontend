import { Component, EventEmitter, Output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor {
  phoneNumber = '';
  @Output() phoneChange = new EventEmitter<string>();

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Solo números

    // Limitar a 9 dígitos
    if (value.length > 9) {
      value = value.substring(0, 9);
    }

    this.phoneNumber = value;
    this.onChange(value);
    this.phoneChange.emit(value);
  }

  isValid(): boolean {
    return this.phoneNumber.length === 9 && this.phoneNumber.startsWith('9');
  }

  getFullPhone(): string {
    return '+51' + this.phoneNumber;
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.phoneNumber = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
