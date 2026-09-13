import { MenuBadgeService } from './menu-badge.service';

describe('Menu badges', () => {
  it('sums all menu counters once for notifications and the collapsed menu', () => {
    const badges = new MenuBadgeService();
    badges.set('surveys', 3);
    badges.set('rewards', 2);
    badges.set('coupons', 4);
    badges.set('orders', 1);
    badges.set('referrals', 2);
    expect(badges.total()).toBe(12);
    badges.set('surveys', 1);
    expect(badges.total()).toBe(10);
  });
  it('starts empty and normalizes invalid counters', () => {
    const badges = new MenuBadgeService();
    expect(badges.total()).toBe(0);
    badges.set('surveys', -1);
    badges.set('rewards', NaN);
    expect(badges.total()).toBe(0);
  });
});
