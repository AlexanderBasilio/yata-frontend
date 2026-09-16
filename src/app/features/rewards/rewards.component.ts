import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PortalRewardService } from '../../core/services/portal/portal-reward.service';
import { PortalHomeSummaryService } from '../../core/services/portal/portal-home-summary.service';
import { RewardResponse, ClaimRewardResponse, RewardItemResponse } from '../../core/models/portal-reward.model';
import { MenuBadgeService } from '../../core/services/portal/menu-badge.service';

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
  private menuBadges = inject(MenuBadgeService);
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
  claimedReward = signal<RewardResponse | null>(null);
  claimError = signal<string | null>(null);

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

    const rewardId = this.getRewardId(reward);
    if (rewardId === null) {
      console.warn('⚠️ La recompensa no contiene un identificador válido:', reward);
      this.claimError.set('No se pudo identificar la recompensa. Actualiza la página e inténtalo nuevamente.');
      return;
    }

    this.claimingRewardId.set(rewardId);
    this.claimError.set(null);

    this.rewardService.claimReward(rewardId).subscribe({
      next: (res) => {
        this.claimingRewardId.set(null);
        // Remover de pendientes
        const updated = this.pendingRewards().filter(r => this.getRewardId(r) !== rewardId);
        this.pendingRewards.set(updated);
        this.menuBadges.set('rewards', updated.length);

        // Acreditar saldo
        const coins = this.getClaimedAmount(res, 'ZISI_COINS') || reward.zisiCoins || 0;
        const xp = this.getClaimedAmount(res, 'XP_POINTS') || reward.xp || 0;
        this.currentZisiCoins.set(res?.newBalanceZisiCoins ?? (this.currentZisiCoins() + coins));
        this.currentXp.set(res?.newTotalXp ?? (this.currentXp() + xp));

        this.claimedReward.set(reward);
        this.claimSuccessData.set(res || {
          rewardId,
          status: 'CLAIMED',
          zisiCoinsAwarded: coins,
          xpAwarded: xp,
          message: `¡Has recibido ${coins} ZisiCoins y ${xp} XP!`
        });
      },
      error: (err) => {
        this.claimingRewardId.set(null);
        console.warn('⚠️ Error al reclamar recompensa:', err);
        this.claimError.set('No se pudo reclamar la recompensa. Inténtalo nuevamente.');
      }
    });
  }

  getRewardId(reward: RewardResponse): string | number | null {
    return reward.id ?? reward.uuid ?? reward.rewardId ?? null;
  }

  getClaimedAmount(
    claim: ClaimRewardResponse | null | undefined,
    itemType: 'ZISI_COINS' | 'XP_POINTS'
  ): number {
    const claimedItems = claim?.claimedItems?.filter(item => item.itemType === itemType) ?? [];
    if (claimedItems.length > 0) {
      return claimedItems.reduce((total, item) => total + (Number(item.finalAmount) || 0), 0);
    }

    return itemType === 'ZISI_COINS'
      ? Number(claim?.zisiCoinsAwarded) || 0
      : Number(claim?.xpAwarded) || 0;
  }

  closeClaimModal() {
    this.claimSuccessData.set(null);
    this.claimedReward.set(null);
  }

  getRewardName(reward: RewardResponse): string {
    return reward.definition?.name || reward.title || 'Recompensa';
  }

  getRewardSource(reward: RewardResponse): string {
    return reward.source?.type || reward.sourceType || 'SYSTEM';
  }

  getRewardItems(reward: RewardResponse): RewardItemResponse[] {
    if (reward.items?.length) return reward.items;
    const items: RewardItemResponse[] = [];
    if (Number(reward.zisiCoins) > 0) items.push({ id: 0, itemType: 'ZISI_COINS', finalAmount: Number(reward.zisiCoins) });
    if (Number(reward.xp) > 0) items.push({ id: 1, itemType: 'XP_POINTS', finalAmount: Number(reward.xp) });
    return items;
  }

  getClaimedItems(data: ClaimRewardResponse): RewardItemResponse[] {
    return data.claimedItems?.length || data.items?.length
      ? (data.claimedItems?.length ? data.claimedItems : data.items) || []
      : this.claimedReward() ? this.getRewardItems(this.claimedReward()!) : [];
  }

  getItemDisplay(item: RewardItemResponse): { icon: string; badge: string; detail: string } {
    switch (item.itemType) {
      case 'FREE_DELIVERY': {
        const maxFee = Number(item.metadata?.['maxDeliveryFee']);
        return { icon: '🛵', badge: 'Envío gratis', detail: maxFee > 0 ? `Cubre hasta S/ ${maxFee.toFixed(2)}` : 'Válido para tu próximo pedido' };
      }
      case 'ZISI_COINS': return { icon: '🪙', badge: `+${Number(item.finalAmount) || 0} Z-Coins`, detail: 'Añadido a tu saldo de monedas' };
      case 'XP_POINTS': return { icon: '⚡', badge: `+${Number(item.finalAmount) || 0} XP`, detail: 'Puntos de experiencia' };
      case 'DISCOUNT_VOUCHER': return { icon: '🎟️', badge: 'Cupón de descuento', detail: item.finalAmount != null ? `Descuento de S/ ${Number(item.finalAmount).toFixed(2)}` : '' };
      case 'FREE_ITEM': return { icon: '🎁', badge: 'Plato de regalo', detail: 'Plato gratis en restaurantes seleccionados' };
      default: return { icon: '🎁', badge: 'Recompensa', detail: '' };
    }
  }

  getRewardIcon(reward: RewardResponse): string {
    const item = this.getRewardItems(reward)[0];
    return item ? this.getItemDisplay(item).icon : this.getSourceIcon(this.getRewardSource(reward));
  }

  getClaimIcon(data: ClaimRewardResponse): string {
    const item = this.getClaimedItems(data)[0];
    return item ? this.getItemDisplay(item).icon : '🎁';
  }

  getClaimMessage(data: ClaimRewardResponse): string {
    if (this.getClaimedItems(data).some(item => item.itemType === 'FREE_DELIVERY')) {
      return 'Tienes 1 envío gratis disponible para tu próxima orden en el checkout.';
    }
    return data.message || '¡Recompensa reclamada exitosamente!';
  }

  getSourceLabel(source: string): string {
    switch (source) {
      case 'SURVEY': return 'Encuesta';
      case 'ORDER': return 'Pedido';
      case 'REFERRAL': return 'Referidos';
      case 'PROMOTION': return 'Promoción';
      case 'ADMIN_GRANT': return 'Sistema';
      case 'EVENT': return 'Evento';
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

  formatDate(dateStr?: string | null): string {
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
