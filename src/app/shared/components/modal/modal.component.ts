import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})

export class ModalComponent {
  @Input() showCloseButton = true;
  @Input() closeOnBackdrop = true;
  @Output() close = new EventEmitter<void>();

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.close.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onModalClick(event: Event): void {
    // Prevenir que el click dentro del modal cierre el backdrop
    event.stopPropagation();
  }
}
