import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { RewardsComponent } from './rewards.component';
import { PortalRewardService } from '../../core/services/portal/portal-reward.service';
import { PortalHomeSummaryService } from '../../core/services/portal/portal-home-summary.service';
import { MenuBadgeService } from '../../core/services/portal/menu-badge.service';
import { RewardResponse } from '../../core/models/portal-reward.model';

describe('Rewards display', () => {
  const reward: RewardResponse = {
    id: 'reward-1', status: 'PENDING_CLAIM', source: { type: 'ADMIN_GRANT', id: 'admin' },
    definition: { code: 'FREE_DELIVERY', name: 'Recompensa por delivery' },
    items: [{ id: 1, itemType: 'FREE_DELIVERY', metadata: { maxDeliveryFee: 8 } }],
    expiresAt: '2026-10-16T00:00:00Z'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RewardsComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PortalRewardService, useValue: {
          getPendingRewards: () => of({ content: [reward] }),
          getRewardsHistory: () => of({ content: [{ ...reward, status: 'CLAIMED', claimedAt: '2026-09-16T00:00:00Z' }] }),
          claimReward: () => of({ rewardId: 'reward-1', claimedItems: reward.items })
        } },
        { provide: PortalHomeSummaryService, useValue: { getHomeSummary: () => of({ header: { zisiCoins: 273 } }) } },
        { provide: MenuBadgeService, useValue: { set: () => {} } },
        { provide: Router, useValue: { navigate: () => {} } }
      ]
    }).compileComponents();
  });

  it('shows the FREE_DELIVERY title and details without empty coin or XP labels', async () => {
    const fixture = TestBed.createComponent(RewardsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const card = fixture.nativeElement.querySelector('.group') as HTMLElement;
    expect(card.textContent).toContain('Recompensa por delivery');
    expect(card.textContent).toContain('Envío gratis');
    expect(card.textContent).toContain('Cubre hasta S/ 8.00');
    expect(card.textContent).not.toContain('Z-Coins');
    expect(card.textContent).not.toContain('XP');
  });

  it('shows the claimed benefit in the modal and history', async () => {
    const fixture = TestBed.createComponent(RewardsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onClaim(reward);
    fixture.detectChanges();
    await fixture.whenStable();
    const modal = fixture.nativeElement.querySelector('.fixed.inset-0') as HTMLElement;
    expect(modal.textContent).toContain('Recompensa por delivery');
    expect(modal.textContent).toContain('Envío gratis');
    expect(modal.textContent).toContain('checkout');
    fixture.componentInstance.closeClaimModal();
    fixture.componentInstance.setTab('HISTORY');
    fixture.detectChanges();
    await fixture.whenStable();
    const history = fixture.nativeElement.textContent as string;
    expect(history).toContain('Recompensa por delivery');
    expect(history).toContain('Envío gratis');
  });
});
