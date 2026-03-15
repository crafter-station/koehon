/**
 * User tier configuration
 */

export const USER_TIERS = {
  FREE: "free",
  PREMIUM: "premium",
} as const;

export type UserTier = (typeof USER_TIERS)[keyof typeof USER_TIERS];

export const TIER_LIMITS = {
  [USER_TIERS.FREE]: {
    maxPages: 20,
  },
  [USER_TIERS.PREMIUM]: {
    maxPages: Infinity,
  },
} as const;

/**
 * Get the maximum number of pages a user can generate based on their tier
 */
export function getMaxPagesForTier(tier: string): number {
  const userTier = tier as UserTier;
  return TIER_LIMITS[userTier]?.maxPages ?? TIER_LIMITS[USER_TIERS.FREE].maxPages;
}

/**
 * Check if a tier has unlimited pages
 */
export function hasUnlimitedPages(tier: string): boolean {
  return getMaxPagesForTier(tier) === Infinity;
}
