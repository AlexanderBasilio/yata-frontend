import { Injectable, computed, signal } from '@angular/core';

export type MenuBadgeKey = 'orders' | 'rewards' | 'surveys' | 'coupons' | 'referrals';

@Injectable({ providedIn: 'root' })
export class MenuBadgeService {
  private readonly counts = signal<Record<MenuBadgeKey, number>>({
    orders: 0, rewards: 0, surveys: 0, coupons: 0, referrals: 0
  });
  readonly total = computed(() => Object.values(this.counts()).reduce((sum, count) => sum + count, 0));
  count(key: MenuBadgeKey): number { return this.counts()[key]; }
  set(key: MenuBadgeKey, count: number) {
    this.counts.update(counts => ({ ...counts, [key]: Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0 }));
  }
}
