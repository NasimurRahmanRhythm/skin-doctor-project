/**
 * Money on the payment slip.
 *
 * Amounts are carried as whole paisa so a slip with a dozen lines adds up to
 * exactly what a calculator says, not to 1499.9999999998.
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
];

function belowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

/** Whole numbers in the lakh/crore grouping a Bangladeshi receipt is read in. */
function wholeInWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${wholeInWords(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(" ");
}

/** 150050 → "One Thousand Five Hundred Taka and Fifty Paisa Only". */
export function amountInWords(paisa: number): string {
  if (!Number.isFinite(paisa) || paisa <= 0) return "";
  const taka = Math.floor(paisa / 100);
  const rem = paisa % 100;
  const parts: string[] = [];
  if (taka) parts.push(`${wholeInWords(taka)} Taka`);
  if (rem) parts.push(`${belowThousand(rem)} Paisa`);
  return `${parts.join(" and ")} Only`;
}

/** What was typed into a cost or quantity box, or null when it is not a number. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * One line of the slip in paisa, from what was typed. A cost with no quantity
 * counts as one; null when either box holds something that is not a number.
 */
export function lineTotalPaisa(cost: string, qty: string): number | null {
  const c = parseAmount(cost);
  if (c === null) return null;
  const q = qty.trim() ? parseAmount(qty) : 1;
  if (q === null) return null;
  return Math.round(c * q * 100);
}

const MONEY =new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 150050 → "1,500.5", grouped the way the words read. */
export function formatPaisa(paisa: number): string {
  return MONEY.format(paisa / 100);
}
