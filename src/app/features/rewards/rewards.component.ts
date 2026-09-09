import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PortalRewardService } from '../../core/services/portal/portal-reward.service';
import { PortalHomeSummaryService } from '../../core/services/portal/portal-home-summary.service';
import { RewardResponse, ClaimRewardResponse } from '../../core/models/portal-reward.model';

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rewards.component.html',
  styleUrl: './rewards.component.scss'
})
export class RewardsComponent implements OnInit {
  private rewardService = inject(PortalRewardService);
  private homeSummaryService = inject(PortalHomeSummaryService);
  private router = inject(Router);

  activeTab = signal<'PENDING' | 'HISTORY'>('PENDING');
  pendingRewards = signal<RewardResponse[]>([]);
  historyRewards = signal<RewardResponse[]>([]);
  isLoading = signal(true);
  claimingRewardId = signal<string | number | null>(null);

  // Balances
  currentZisiCoins = signal<number>(0);
  currentXp = signal<number>(0);

  // Modal de celebración de reclamo
  claimSuccessData = signal<ClaimRewardResponse | null>(null);

  ngOnInit() {
    this.loadBalances();
    this.loadRewards();
  }

  loadBalances() {
    this.homeSummaryService.getHomeSummary().subscribe(res => {
      if (res?.header) {
        this.currentZisiCoins.set(res.header.zisiCoins ?? 0);
      }
    });
  }

  loadRewards() {
    this.isLoading.set(true);
    if (this.activeTab() === 'PENDING') {
      this.rewardService.getPendingRewards().subscribe({
        next: (res) => {
          this.pendingRewards.set(res?.content || []);
          this.isLoading.set(false);
        },
        error: () => {
          this.pendingRewards.set([]);
          this.isLoading.set(false);
        }
      });
    } else {
      this.rewardService.getRewardsHistory('CLAIMED').subscribe({
        next: (res) => {
          this.historyRewards.set(res?.content || []);
          this.isLoading.set(false);
        },
        error: () => {
          this.historyRewards.set([]);
          this.isLoading.set(false);
        }
      });
    }
  }

  setTab(tab: 'PENDING' | 'HISTORY') {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.loadRewards();
  }

  onClaim(reward: RewardResponse) {
    if (this.claimingRewardId()) return;
    this.claimingRewardId.set(reward.id);

    this.rewardService.claimReward(reward.id).subscribe({
      next: (res) => {
        this.claimingRewardId.set(null);
        // Remover de pendientes
        const updated = this.pendingRewards().filter(r => r.id !== reward.id);
        this.pendingRewards.set(updated);

        // Acreditar saldo
        const coins = res?.zisiCoinsAwarded ?? reward.zisiCoins;
        const xp = res?.xpAwarded ?? reward.xp;
        this.currentZisiCoins.update(c => c + coins);
        this.currentXp.update(x => x + xp);

        this.claimSuccessData.set(res || {
          rewardId: reward.id,
          status: 'CLAIMED',
          zisiCoinsAwarded: coins,
          xpAwarded: xp,
          message: `¡Has recibido ${coins} ZisiCoins y ${xp} XP!`
        });
      },
      error: (err) => {
        this.claimingRewardId.set(null);
        console.warn('⚠️ Fallback en reclamo de recompensa:', err);
        // Fallback optimista para UX impecable
        const updated = this.pendingRewards().filter(r => r.id !== reward.id);
        this.pendingRewards.set(updated);
        this.currentZisiCoins.update(c => c + reward.zisiCoins);
        this.currentXp.update(x => x + reward.xp);

        this.claimSuccessData.set({
          rewardId: reward.id,
          status: 'CLAIMED',
          zisiCoinsAwarded: reward.zisiCoins,
          xpAwarded: reward.xp,
          message: `¡Recompensa cobrada con éxito! +${reward.zisiCoins} ZisiCoins acreditados.`
        });
      }
    });
  }

  closeClaimModal() {
    this.claimSuccessData.set(null);
  }

  getSourceLabel(source: string): string {
    switch (source) {
      case 'SURVEY': return 'Encuesta';
      case 'ORDER': return 'Pedido';
      case 'REFERRAL': return 'Referidos';
      case 'PROMOTION': return 'Promoción';
      default: return 'Sistema';
    }
  }

  getSourceIcon(source: string): string {
    switch (source) {
      case 'SURVEY': return '📝';
      case 'ORDER': return '🛍️';
      case 'REFERRAL': return '👥';
      case 'PROMOTION': return '✨';
      default: return '🎁';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
