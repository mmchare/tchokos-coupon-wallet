/**
 * Format wallet balance according to JinBao specifications:
 * - < 1000 FCFA: Show exact amount with "FCAF" suffix
 * - >= 1000 FCFA: Show in "k" format with max 1 decimal (rounded)
 */
export function formatBalance(amount: number): string {
  if (amount < 1000) {
    return `${amount} FCAF`;
  }
  
  const kValue = amount / 1000;
  
  // Round to 1 decimal place
  const rounded = Math.round(kValue * 10) / 10;
  
  // Remove trailing zero if it's a whole number
  if (rounded === Math.floor(rounded)) {
    return `${Math.floor(rounded)}k`;
  }
  
  return `${rounded}k`;
}
