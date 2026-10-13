import { QUALITY_POLICY } from '../config/quality';
import { QualityTier } from '../signaling/protocol';

export class StatsMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private consecutiveBadReads = 0;
  private goodReadsStartTimestamp: number | null = null;
  private getPeerConnections: () => RTCPeerConnection[];
  private onQualityWarning: (degradeTo: QualityTier | 'close-camera') => void;
  private onQualityRecover: () => void;

  constructor(
    getPeerConnections: () => RTCPeerConnection[],
    onQualityWarning: (action: QualityTier | 'close-camera') => void,
    onQualityRecover: () => void
  ) {
    this.getPeerConnections = getPeerConnections;
    this.onQualityWarning = onQualityWarning;
    this.onQualityRecover = onQualityRecover;
  }

  public start() {
    this.stop();
    this.intervalId = setInterval(() => {
      this.checkStats();
    }, QUALITY_POLICY.stats_monitor.interval_ms);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.consecutiveBadReads = 0;
    this.goodReadsStartTimestamp = null;
  }

  private async checkStats() {
    const pcs = this.getPeerConnections();
    if (pcs.length === 0) return;

    let isAnyBad = false;

    for (const pc of pcs) {
      if (pc.connectionState !== 'connected') continue;

      try {
        const stats = await pc.getStats();
        for (const report of stats.values()) {
          // 1. outbound-rtp qualityLimitationReason === 'cpu'
          if (report.type === 'outbound-rtp' && report.qualityLimitationReason === 'cpu') {
            isAnyBad = true;
            break;
          }

          // 2. remote-inbound-rtp.fractionLost > 0.08
          if (report.type === 'remote-inbound-rtp' && typeof report.fractionLost === 'number') {
            if (report.fractionLost > QUALITY_POLICY.stats_monitor.bad_fraction_lost) {
              isAnyBad = true;
              break;
            }
          }

          // 3. candidate-pair availableOutgoingBitrate check
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.availableOutgoingBitrate && report.availableOutgoingBitrate < 300000) {
              // Menor que ~300kbps em par selecionado
              isAnyBad = true;
              break;
            }
          }
        }
      } catch (e) {
        // Ignora leituras falhas durante fechamento de conexão
      }

      if (isAnyBad) break;
    }

    const now = Date.now();

    if (isAnyBad) {
      this.consecutiveBadReads++;
      this.goodReadsStartTimestamp = null;

      if (this.consecutiveBadReads >= QUALITY_POLICY.stats_monitor.consecutive_bad_reads_threshold) {
        // Desce um degrau
        this.onQualityWarning('medium');
      }
    } else {
      this.consecutiveBadReads = 0;
      if (!this.goodReadsStartTimestamp) {
        this.goodReadsStartTimestamp = now;
      } else if (now - this.goodReadsStartTimestamp >= QUALITY_POLICY.stats_monitor.good_reads_recover_ms) {
        this.onQualityRecover();
        this.goodReadsStartTimestamp = null;
      }
    }
  }
}
