import { Injectable, NgZone, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private ngZone = inject(NgZone);
  private credentialSubject = new Subject<string>();
  private isInitialized = false;

  public credential$: Observable<string> = this.credentialSubject.asObservable();

  /**
   * Inicializa la SDK de Google Identity Services si aún no ha sido cargada/inicializada.
   */
  initializeGoogle(onTokenReceived?: (idToken: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ensureGsiLoaded()
        .then(() => {
          if (!this.isInitialized && typeof google !== 'undefined' && google?.accounts?.id) {
            google.accounts.id.initialize({
              client_id: environment.googleClientId,
              callback: (response: any) => {
                if (response?.credential) {
                  this.ngZone.run(() => {
                    this.credentialSubject.next(response.credential);
                    if (onTokenReceived) {
                      onTokenReceived(response.credential);
                    }
                  });
                }
              },
              auto_select: false,
              cancel_on_tap_outside: true
            });
            this.isInitialized = true;
          }
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Renderiza el botón oficial de Google en un elemento HTML del DOM.
   */
  renderButton(element: HTMLElement, options: any = {}): void {
    this.initializeGoogle().then(() => {
      if (typeof google !== 'undefined' && google?.accounts?.id && element) {
        element.innerHTML = '';
        google.accounts.id.renderButton(element, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: element.clientWidth || 320,
          ...options
        });
      }
    });
  }

  /**
   * Despliega la ventana flotante / One Tap de Google.
   */
  promptOneTap(): void {
    this.initializeGoogle().then(() => {
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        google.accounts.id.prompt();
      }
    });
  }

  /**
   * Garantiza que el script https://accounts.google.com/gsi/client esté cargado en el documento.
   */
  private ensureGsiLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        return resolve();
      }

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (typeof google !== 'undefined' && google?.accounts?.id) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 50) { // Timeout de 5 segundos
          clearInterval(interval);
          reject(new Error('Google Identity Services SDK failed to load.'));
        }
      }, 100);
    });
  }
}
