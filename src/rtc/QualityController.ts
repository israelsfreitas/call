import { QUALITY_POLICY, TierConfig } from '../config/quality';
import { QualityTier } from '../signaling/protocol';

export class QualityController {
  private currentTierName: QualityTier = 'high';
  private localOverrideTierName: QualityTier | null = null;
  private upgradeTimer: ReturnType<typeof setTimeout> | null = null;
  private activeReceiversCamera = 0;
  private activeReceiversScreen = 0;
  private hasCamera = false;
  private hasScreen = false;
  private onParametersChanged?: () => void;

  constructor(onParametersChanged?: () => void) {
    this.onParametersChanged = onParametersChanged;
  }

  public setRoomTier(tier: QualityTier) {
    if (this.currentTierName === tier) return;

    const rank = { high: 3, medium: 2, low: 1 };
    const isDowngrade = rank[tier] < rank[this.currentTierName];

    if (isDowngrade) {
      if (this.upgradeTimer) {
        clearTimeout(this.upgradeTimer);
        this.upgradeTimer = null;
      }
      this.currentTierName = tier;
      this.onParametersChanged?.();
    } else {
      // Histerese de 5000ms para upgrade
      if (this.upgradeTimer) clearTimeout(this.upgradeTimer);
      this.upgradeTimer = setTimeout(() => {
        this.currentTierName = tier;
        this.upgradeTimer = null;
        this.onParametersChanged?.();
      }, QUALITY_POLICY.hysteresis.upgrade_delay_ms);
    }
  }

  public setLocalOverride(tier: QualityTier | null) {
    this.localOverrideTierName = tier;
    this.onParametersChanged?.();
  }

  public updateActiveStreams(hasCamera: boolean, hasScreen: boolean) {
    this.hasCamera = hasCamera;
    this.hasScreen = hasScreen;
    this.onParametersChanged?.();
  }

  public updateReceiversCount(cameraReceivers: number, screenReceivers: number) {
    this.activeReceiversCamera = Math.max(1, cameraReceivers);
    this.activeReceiversScreen = Math.max(1, screenReceivers);
    this.onParametersChanged?.();
  }

  public getEffectiveTier(): TierConfig {
    const activeTierName = this.localOverrideTierName || this.currentTierName;
    return QUALITY_POLICY.tiers.find(t => t.name === activeTierName) || QUALITY_POLICY.tiers[0];
  }

  public getSenderParameters(kind: 'camera' | 'screen'): {
    maxBitrate: number;
    maxFramerate: number;
    scaleResolutionDownBy: number;
  } {
    const tier = this.getEffectiveTier();
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
    const totalBudget = isMobile
      ? QUALITY_POLICY.sender_upload_budget.budget_kbps.mobile
      : QUALITY_POLICY.sender_upload_budget.budget_kbps.desktop;

    let share = 1.0;
    if (this.hasCamera && this.hasScreen) {
      share = kind === 'screen'
        ? QUALITY_POLICY.sender_upload_budget.split_when_both_open.screen
        : QUALITY_POLICY.sender_upload_budget.split_when_both_open.camera;
    }

    const receivers = kind === 'camera' ? this.activeReceiversCamera : this.activeReceiversScreen;
    const tierCap = kind === 'camera' ? tier.camera.max_kbps : tier.screen.max_kbps;
    const floor = kind === 'camera'
      ? QUALITY_POLICY.sender_upload_budget.floor_kbps.camera
      : QUALITY_POLICY.sender_upload_budget.floor_kbps.screen;

    const calculatedKbps = Math.max(
      floor,
      Math.min(tierCap, Math.floor((totalBudget * share) / receivers))
    );

    let scaleResolutionDownBy = 1;
    let maxFramerate = kind === 'camera' ? tier.camera.max_fps : tier.screen.max_fps;

    if (kind === 'camera') {
      // Ladder para câmera: 720p -> 360p (escala 2) -> 180p (escala 4)
      if (calculatedKbps >= 900 && tier.camera.max_height >= 720) {
        scaleResolutionDownBy = 1;
      } else if (calculatedKbps >= 250 && tier.camera.max_height >= 360) {
        scaleResolutionDownBy = 2; // 720 / 2 = 360
      } else {
        scaleResolutionDownBy = 4; // 720 / 4 = 180
      }
    } else {
      // Ladder para tela: prioridade manter resolução/nitidez, abaixar FPS se necessário
      if (calculatedKbps >= 1500 && tier.screen.max_height >= 1080) {
        scaleResolutionDownBy = 1;
      } else {
        scaleResolutionDownBy = 1080 / Math.min(1080, tier.screen.max_height);
        if (scaleResolutionDownBy < 1) scaleResolutionDownBy = 1;
      }
    }

    return {
      maxBitrate: calculatedKbps * 1000,
      maxFramerate,
      scaleResolutionDownBy
    };
  }

  public async applyToSender(sender: RTCRtpSender, kind: 'camera' | 'screen', isVisible = true) {
    if (!sender || !sender.track) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      if (!isVisible) {
        params.encodings[0].active = false;
      } else {
        params.encodings[0].active = true;
        const config = this.getSenderParameters(kind);
        params.encodings[0].maxBitrate = config.maxBitrate;
        params.encodings[0].maxFramerate = config.maxFramerate;
        params.encodings[0].scaleResolutionDownBy = config.scaleResolutionDownBy;
      }

      await sender.setParameters(params);
    } catch (e) {
      // Ignorar erros se transição estiver em andamento
    }
  }
}
