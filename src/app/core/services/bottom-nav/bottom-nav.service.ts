import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BottomNavService {
  /**
   * Signal reactivo que indica si la barra inferior de navegación está temporalmente oculta
   * (por ejemplo, al abrir la modal de pantalla completa de Carta Rápida).
   */
  private _isTemporarilyHidden = signal<boolean>(false);

  readonly isTemporarilyHidden = this._isTemporarilyHidden.asReadonly();

  /**
   * Oculta el Bottom Nav Bar
   */
  hide(): void {
    this._isTemporarilyHidden.set(true);
  }

  /**
   * Vuelve a mostrar el Bottom Nav Bar
   */
  show(): void {
    this._isTemporarilyHidden.set(false);
  }

  /**
   * Permite fijar el estado directamente
   */
  setVisible(visible: boolean): void {
    this._isTemporarilyHidden.set(!visible);
  }
}
