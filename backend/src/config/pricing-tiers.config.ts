/**
 * Pricing & Chromaticity Coverage Configuration (ISO/IEC 24712 Standards & Counter Economics)
 *
 * Provides centralized, configurable thresholds, pricing tiers, and chromaticity math parameters.
 * Eliminates all hardcoded threshold values across document conversion and costing engines.
 */

export interface ColorTierThresholds {
  tier0Max: number; // Cutoff below which is classified as Monochrome B&W (e.g. 0.010 = 1.0%)
  tier1Max: number; // Cutoff below which is classified as Spot / Logo Accent (e.g. 0.080 = 8.0%)
  tier2Max: number; // Cutoff below which is classified as Medium Color Graphic (e.g. 0.350 = 35.0%)
}

export interface ColorTierPrices {
  tier0: number; // Monochrome (B&W) price (PHP)
  tier1: number; // Spot / Logo Accent price (PHP)
  tier2: number; // Medium Color Graphic price (PHP)
  tier3: number; // Heavy / Full Photo Color price (PHP)
}

export interface ChromaticityMathParams {
  ycbcrRadius: number; // US Patent 7,724,982 cylindrical chromaticity radius (Default: 10.0)
  paperWhiteLuminance: number; // Paper white cutoff in BT.601 Y (Default: 246)
  grayscaleSpreadThreshold: number; // Grayscale-in-RGB max channel spread |R-G| & |G-B| (Default: 10)
  grayscaleImmunityFraction: number; // Fraction of near-gray pixels for immunity (Default: 0.98)
  vectorBaseContribution: number; // Minimum Spot Color ratio for vector color tokens (Default: 0.015)
  vectorTokenMultiplier: number; // Additional chromatic ratio per vector color token (Default: 0.010)
  vectorMaxContribution: number; // Maximum chromatic ratio contributed by vector tokens (Default: 0.080)
}

export interface PricingCoverageConfig {
  thresholds: ColorTierThresholds;
  prices: ColorTierPrices;
  mathParams: ChromaticityMathParams;
}

export const DEFAULT_PRICING_CONFIG: PricingCoverageConfig = {
  thresholds: {
    tier0Max: 0.01, // < 1.0% = Monochrome B&W
    tier1Max: 0.085, // 1.0% - 8.0% = Spot / Logo Accent
    tier2Max: 0.35, // 8.0% - 35.0% = Medium Color Graphics / Charts / Maps
  },
  prices: {
    tier0: 3.0,
    tier1: 8.0,
    tier2: 15.0,
    tier3: 20.0,
  },
  mathParams: {
    ycbcrRadius: 10.0,
    paperWhiteLuminance: 246,
    grayscaleSpreadThreshold: 10,
    grayscaleImmunityFraction: 0.98,
    vectorBaseContribution: 0.015,
    vectorTokenMultiplier: 0.01,
    vectorMaxContribution: 0.08,
  },
};

let currentPricingConfig: PricingCoverageConfig = { ...DEFAULT_PRICING_CONFIG };

export function getPricingConfig(): PricingCoverageConfig {
  return currentPricingConfig;
}

export function updatePricingConfig(
  overrides: Partial<PricingCoverageConfig>,
): PricingCoverageConfig {
  currentPricingConfig = {
    thresholds: {
      ...currentPricingConfig.thresholds,
      ...(overrides.thresholds || {}),
    },
    prices: { ...currentPricingConfig.prices, ...(overrides.prices || {}) },
    mathParams: {
      ...currentPricingConfig.mathParams,
      ...(overrides.mathParams || {}),
    },
  };
  return currentPricingConfig;
}

export function resetPricingConfig(): PricingCoverageConfig {
  currentPricingConfig = JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG));
  return currentPricingConfig;
}

export function classifyColorTier(
  chromaticRatio: number,
  isGrayscaleEncoded: boolean = false,
  config: PricingCoverageConfig = currentPricingConfig,
): {
  tier: 0 | 1 | 2 | 3;
  tierName: string;
  unitPrice: number;
  estimatedCoverage: string;
} {
  const { thresholds, prices } = config;

  if (isGrayscaleEncoded || chromaticRatio < thresholds.tier0Max) {
    return {
      tier: 0,
      tierName: "Monochrome (B&W)",
      unitPrice: prices.tier0,
      estimatedCoverage: `<${(thresholds.tier0Max * 100).toFixed(1)}% Color (B&W)`,
    };
  } else if (chromaticRatio < thresholds.tier1Max) {
    return {
      tier: 1,
      tierName: "Spot / Logo Accent Color",
      unitPrice: prices.tier1,
      estimatedCoverage: `${(chromaticRatio * 100).toFixed(1)}% Spot / Header Color`,
    };
  } else if (chromaticRatio < thresholds.tier2Max) {
    return {
      tier: 2,
      tierName: "Medium Color Graphic",
      unitPrice: prices.tier2,
      estimatedCoverage: `${(chromaticRatio * 100).toFixed(1)}% Charts / Slides / Maps`,
    };
  } else {
    return {
      tier: 3,
      tierName: "Heavy / Full Photo Color",
      unitPrice: prices.tier3,
      estimatedCoverage: `${(chromaticRatio * 100).toFixed(1)}% Full Bleed Color`,
    };
  }
}

export function getTierDisplayLabels(
  config: PricingCoverageConfig = currentPricingConfig,
) {
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
