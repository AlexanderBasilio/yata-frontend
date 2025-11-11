import { Injectable } from '@angular/core';

export interface StoreHours {
  open: string;
  close: string;
}

@Injectable({
  providedIn: 'root'
})
export class StoreHoursService {
  private readonly STORE_HOURS: StoreHours = {
    open: '9:00',
    close: '22:30'
  };

  getStoreHours(): StoreHours {
    return { ...this.STORE_HOURS };
  }

  isOpen(): boolean {
    const now = new Date();
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const hours = peruTime.getHours().toString().padStart(2, '0');
    const minutes = peruTime.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    return currentTime >= this.STORE_HOURS.open && currentTime < this.STORE_HOURS.close;
  }

  getCurrentTimeInPeru(): string {
    const now = new Date();
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const hours = peruTime.getHours().toString().padStart(2, '0');
    const minutes = peruTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
