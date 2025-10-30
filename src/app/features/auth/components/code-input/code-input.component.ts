import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-code-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './code-input.component.html',
  styleUrl: './code-input.component.scss'
})
export class CodeInputComponent {
  code = ['', '', '', '', '', ''];
  @Output() codeComplete = new EventEmitter<string>();
  @Output() codeChange = new EventEmitter<string>();

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Solo números

    if (value) {
      this.code[index] = value[0];

      // Auto-focus al siguiente input
      if (index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`) as HTMLInputElement;
        nextInput?.focus();
      }

      // Emitir el código si está completo
      const fullCode = this.code.join('');
      this.codeChange.emit(fullCode);

      if (fullCode.length === 6) {
        this.codeComplete.emit(fullCode);
      }
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    // Backspace: borrar y volver al anterior
    if (event.key === 'Backspace' && !this.code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '');

    if (pastedData && pastedData.length === 6) {
      this.code = pastedData.split('');
      this.codeComplete.emit(pastedData);
    }
  }

  isComplete(): boolean {
    return this.code.every(digit => digit !== '');
  }

  getCode(): string {
    return this.code.join('');
  }

  clear(): void {
    this.code = ['', '', '', '', '', ''];
    const firstInput = document.getElementById('code-0') as HTMLInputElement;
    firstInput?.focus();
  }
}
