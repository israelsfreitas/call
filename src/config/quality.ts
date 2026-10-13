export type QualityTierName = 'high' | 'medium' | 'low';

export interface TierConfig {
  name: QualityTierName;
  active_videos: { min: number; max: number };
  camera: { max_height: number; max_fps: number; max_kbps: number };
  screen: { max_height: number; max_fps: number; max_kbps: number };
}

export const QUALITY_POLICY = {
  caps: {
    max_active_videos: 12,
    max_screens: 3,
    max_cameras: 10
  },
  tiers: [
    {
      name: "high",
      active_videos: { min: 0, max: 4 },
      camera: { max_height: 720, max_fps: 30, max_kbps: 1200 },
      screen: { max_height: 1080, max_fps: 15, max_kbps: 2500 }
    },
    {
      name: "medium",
      active_videos: { min: 5, max: 8 },
      camera: { max_height: 360, max_fps: 20, max_kbps: 400 },
      screen: { max_height: 720, max_fps: 10, max_kbps: 1000 }
    },
    {
      name: "low",
      active_videos: { min: 9, max: 12 },
      camera: { max_height: 180, max_fps: 15, max_kbps: 150 },
      screen: { max_height: 720, max_fps: 5, max_kbps: 500 }
    }
  ] as TierConfig[],
  sender_upload_budget: {
    budget_kbps: { desktop: 4000, mobile: 2000 },
    split_when_both_open: { screen: 0.6, camera: 0.4 },
    floor_kbps: { camera: 80, screen: 250 }
  },
  resolution_ladder: {
    camera: [
      { height: 720, min_kbps: 900 },
      { height: 360, min_kbps: 250 },
      { height: 180, min_kbps: 80 }
    ],
    screen: [
      { height: 1080, min_kbps: 1500 },
      { height: 720, min_kbps: 250 }
    ]
  },
  hysteresis: {
    downgrade: 0,
    upgrade_delay_ms: 5000
  },
  stats_monitor: {
    interval_ms: 3000,
    bad_fraction_lost: 0.08,
    bad_bitrate_ratio: 0.70,
    consecutive_bad_reads_threshold: 3,
    good_reads_recover_ms: 30000
  }
};
