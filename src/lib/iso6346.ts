const LETTER_VAL: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

export function normalizeContainer(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

export function formatContainer(raw: string): string {
  const n = normalizeContainer(raw);
  if (n.length <= 4) return n;
  if (n.length <= 10) return `${n.slice(0, 4)} ${n.slice(4)}`;
  return `${n.slice(0, 4)} ${n.slice(4, 10)} ${n.slice(10)}`;
}

function charVal(ch: string): number {
  if (ch >= "0" && ch <= "9") return Number(ch);
  return LETTER_VAL[ch] ?? 0;
}

export function computeCheckDigit(first10: string): number {
  const s = first10.toUpperCase();
  let sum = 0;
  for (let i = 0; i < 10; i += 1) sum += charVal(s[i] ?? "0") * 2 ** i;
  const mod = sum % 11;
  return mod === 10 ? 0 : mod;
}

export function isValidContainer(raw: string): boolean {
  const n = normalizeContainer(raw);
  if (!/^[A-Z]{3}[UJZ]\d{7}$/.test(n)) return false;
  return computeCheckDigit(n.slice(0, 10)) === Number(n[10]);
}

export const OWNER_TO_LINE: Record<string, string> = {
  HLXU: "Hapag-Lloyd", HLBU: "Hapag-Lloyd", HAMU: "Hapag-Lloyd", HAHU: "Hapag-Lloyd",
  SUDU: "Hapag-Lloyd", BEAU: "Hapag-Lloyd",
  MSCU: "MSC", MSEU: "MSC", MEDU: "MSC", BMOU: "MSC", UETU: "MSC",
  MSKU: "Maersk", MRKU: "Maersk", TLLU: "Maersk",
  CMAU: "CMA CGM", CGMU: "CMA CGM", TCLU: "CMA CGM",
  ONEU: "ONE", NYKU: "ONE", MOLU: "ONE",
  EISU: "Evergreen", EMCU: "Evergreen",
  CSNU: "COSCO", CBHU: "COSCO", COSU: "COSCO",
  HMMU: "HMM", HDMU: "HMM",
  YMLU: "Yang Ming", ZIMU: "ZIM",
  TGHU: "Textainer", TCNU: "Textainer", TEMU: "Textainer",
  SEGU: "Seaco", CAIU: "CAI",
};

export function suggestNaviera(containerNo: string): string | null {
  const n = normalizeContainer(containerNo);
  if (n.length < 4) return null;
  return OWNER_TO_LINE[n.slice(0, 4)] ?? null;
}

export function lineCode(naviera: string): string {
  const n = naviera.toUpperCase();
  if (n.includes("HAPAG") || n === "HL") return "HL";
  if (n.includes("MSC")) return "MSC";
  if (n.includes("MAERSK")) return "MAEU";
  if (n.includes("CMA")) return "CMA";
  if (n.includes("ONE")) return "ONE";
  if (n.includes("CAI")) return "CAI";
  return naviera.slice(0, 4).toUpperCase();
}
