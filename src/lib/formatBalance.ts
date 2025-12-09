/**
 * Format wallet balance according to JinBao Smart Market V2.0 specifications:
 * - < 1000 FCAF: Show exact amount with "FCAF" suffix (Gris Argent or Noir color)
 * - >= 1000 FCAF: Show in "k" format with max 1 decimal (rounded), remove trailing zeros
 *   Examples: 1500 -> "1.5k", 1555 -> "1.6k", 10000 -> "10k"
 */
export function formatBalance(balance: number): string {
  if (balance < 1000) {
    return `${balance} FCAF`;
  }
  
  const inK = balance / 1000;
  const rounded = Math.round(inK * 10) / 10;
  
  // Remove trailing zero if it's a whole number
  if (rounded % 1 === 0) {
    return `${rounded}k`;
  }
  
  return `${rounded.toFixed(1)}k`;
}