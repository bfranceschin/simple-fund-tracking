import { TokenMetadata } from "@/lib/types/portfolio";

/**
 * Get unique token IDs that need price fetching (handles special calculations).
 */
export function getUniqueTokenIdsForPricing(tokens: TokenMetadata[]): string[] {
  const tokenIds = new Set<string>();

  for (const token of tokens) {
    if (token.specialCalculation === "ETH_AMOUNT") {
      tokenIds.add("ethereum");
    } else if (token.specialCalculation === "BTC_AMOUNT") {
      tokenIds.add("bitcoin");
    } else if (!token.specialCalculation || token.specialCalculation === "REGULAR") {
      tokenIds.add(token.id);
    }
  }

  return Array.from(tokenIds);
}
