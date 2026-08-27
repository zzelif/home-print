/**
 * Pricing & Coverage Configuration for Frontend UI
 * Dynamic threshold label calculation eliminating hardcoded values in templates.
 */

export interface ColorTierThresholds {
  tier0Max: number;
  tier1Max: number;
  tier2Max: number;
}

export interface ColorTierPrices {
  tier0: number;
  tier1: number;
  tier2: number;
  tier3: number;
}

export interface PricingCoverageConfig {
  thresholds: ColorTierThresholds;
  prices: ColorTierPrices;
}

export const DEFAULT_PRICING_CONFIG: PricingCoverageConfig = {
  thresholds: {
    tier0Max: 0.010, // < 1.0% = Monochrome B&W
    tier1Max: 0.080, // 1.0% - 8.0% = Spot / Logo Accent
    tier2Max: 0.350, // 8.0% - 35.0% = Medium Color Graphics / Charts / Maps
  },
  prices: {
    tier0: 3.00,
    tier1: 8.00,
    tier2: 15.00,
    tier3: 20.00,
  },
};

export function getTierDisplayLabels(config: PricingCoverageConfig = DEFAULT_PRICING_CONFIG) {
  const { thresholds, prices } = config;
  const t0 = (thresholds.tier0Max * 100).toFixed(1);
  const t1 = (thresholds.tier1Max * 100).toFixed(1);
  const t2 = (thresholds.tier2Max * 100).toFixed(1);

  return {
    tier0: `Monochrome (B&W @ ₱${prices.tier0.toFixed(2)} • <${t0}% ink area)`,
    tier1: `Spot / Accent Color (${t0}%–${t1}% @ ₱${prices.tier1.toFixed(2)})`,
    tier2: `Medium Color Graphics (${t1}%–${t2}% @ ₱${prices.tier2.toFixed(2)})`,
    tier3: `Heavy / Full Photo Color (≥${t2}% @ ₱${prices.tier3.toFixed(2)})`,
  };
}
