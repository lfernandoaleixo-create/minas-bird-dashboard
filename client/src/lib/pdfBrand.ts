/**
 * Módulo compartilhado de estilo PDF — Criatório Minas Bird
 * Todos os PDFs do sistema devem usar estas funções para manter
 * identidade visual consistente (header verde escuro + logo real + rodapé).
 */
import { jsPDF } from "jspdf";

// =============================================
// BRAND COLORS
// =============================================
export const BRAND = {
  primary: [16, 185, 129] as [number, number, number],
  dark: [6, 78, 59] as [number, number, number],
  medium: [5, 150, 105] as [number, number, number],
  light: [209, 250, 229] as [number, number, number],
  bg: [240, 253, 244] as [number, number, number],
  text: [41, 37, 36] as [number, number, number],
  muted: [120, 113, 108] as [number, number, number],
  amber: [180, 83, 9] as [number, number, number],
  amberBg: [255, 251, 235] as [number, number, number],
  green: [21, 128, 61] as [number, number, number],
  greenBg: [240, 253, 244] as [number, number, number],
  red: [185, 28, 28] as [number, number, number],
  redBg: [254, 242, 242] as [number, number, number],
  yellow: [161, 98, 7] as [number, number, number],
  yellowBg: [254, 252, 232] as [number, number, number],
  blue: [29, 78, 216] as [number, number, number],
  blueBg: [239, 246, 255] as [number, number, number],
  feriado: [220, 38, 38] as [number, number, number],
  gridLine: [229, 231, 235] as [number, number, number],
};

export const CATEGORY_COLORS: Record<string, { r: number; g: number; b: number; bgR: number; bgG: number; bgB: number }> = {
  racao:     { r: 180, g: 83, b: 9,   bgR: 255, bgG: 251, bgB: 235 },
  vegetais:  { r: 5, g: 150, b: 105,  bgR: 236, bgG: 253, bgB: 245 },
  frutas:    { r: 220, g: 38, b: 38,  bgR: 254, bgG: 242, bgB: 242 },
  proteicos: { r: 126, g: 34, b: 206, bgR: 250, bgG: 245, bgB: 255 },
};

// =============================================
// LOGO LOADER (real logo image)
// =============================================
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663426530649/GUVCZBcaMUVxbcauwK97Fr/logo3d_d58b8c94.png";

let _cachedLogo: string | null | undefined = undefined;

export async function loadLogo(): Promise<string | null> {
  if (_cachedLogo !== undefined) return _cachedLogo;
  try {
    const resp = await fetch(LOGO_URL);
    const blob = await resp.blob();
    _cachedLogo = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    _cachedLogo = null;
  }
  return _cachedLogo;
}

// =============================================
// SHARED HEADER — green bar + real logo + title
// Returns the Y position after the header
// =============================================
export function drawBrandHeader(
  doc: jsPDF,
  pageW: number,
  logoBase64: string | null,
  title: string,
  subtitle: string,
  options?: { rightTitle?: string; rightSubtitle?: string },
): number {
  const barH = 18;

  // Dark green bar
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, barH, "F");

  // Real logo
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 5, 1, 16, 16); } catch { /* skip */ }
  }

  // Criatório name (left)
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Criatório Minas Bird", 24, 8);

  // "Manual Operacional de Alimentação" — centered
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 230, 210);
  doc.text("Manual Operacional de Alimentação", pageW / 2, 12, { align: "center" });

  // Accent line
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, barH, pageW, 1.5, "F");

  // Title area below bar
  const titleY = barH + 5;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(title, 10, titleY);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(subtitle, 10, titleY + 4.5);
  }

  // Right side info
  if (options?.rightTitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(options.rightTitle, pageW - 10, titleY, { align: "right" });
  }
  if (options?.rightSubtitle) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(options.rightSubtitle, pageW - 10, titleY + 4.5, { align: "right" });
  }

  return titleY + 8;
}

// =============================================
// SHARED FOOTER — date + criatório name + page
// =============================================
export function drawBrandFooter(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  pageNum?: number,
  totalPages?: number,
): void {
  const fy = pageH - 6;

  // Separator line
  doc.setDrawColor(...BRAND.medium);
  doc.setLineWidth(0.3);
  doc.line(8, fy - 2, pageW - 8, fy - 2);

  // Date
  const now = new Date();
  const ds = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`Publicado em ${ds}`, 8, fy);

  // Center name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.dark);
  doc.text("Criatório Minas Bird — Ribeirão Vermelho, MG", pageW / 2, fy, { align: "center" });

  // Page number
  if (pageNum !== undefined && totalPages !== undefined) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - 8, fy, { align: "right" });
  }
}

// =============================================
// FOOD NAME CLEANING
// =============================================
const SUFFIX_PATTERN = /[,;]\s*(?:Crua?|Cozid[ao]|Assad[ao]|com\s+[Cc]asca|sem\s+[Cc]asca|Fresc[ao]|Sec[ao]|Inteira?o?|Madur[ao]|Verde|Natural|em\s+Pó|Desidratad[ao]|Moíd[ao]|Triturad[ao]|Ralad[ao]|Picad[ao]|Fatiado|em\s+Flocos|em\s+Grãos|em\s+Pedaços)\s*$/gi;
const DASH_SUFFIX = /\s*[-–]\s*(?:Crua?|Cozid[ao]|Assad[ao]|com\s+[Cc]asca|sem\s+[Cc]asca|Fresc[ao]|Sec[ao]|Inteira?o?|Madur[ao]|Verde|Natural|em\s+Pó|Desidratad[ao]|Moíd[ao]|Triturad[ao]|Ralad[ao]|Picad[ao]|Fatiado|em\s+Flocos|em\s+Grãos|em\s+Pedaços)/gi;

export function cleanFoodName(raw: string): string {
  let name = raw;
  // Remove trailing comma-separated suffixes iteratively
  let prev = "";
  while (prev !== name) {
    prev = name;
    name = name.replace(SUFFIX_PATTERN, "").trim();
  }
  // Remove dash-separated suffixes
  name = name.replace(DASH_SUFFIX, "").trim();
  // Fix common typos
  name = name.replace(/^Maça$/i, "Maçã");
  return name;
}

// =============================================
// WEIGHT FORMATTING
// =============================================
export function fmtWeight(g: number): string {
  if (g >= 1000) {
    return (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " kg";
  }
  return Math.round(g) + " g";
}

export function fmtWeightShort(g: number): string {
  if (g >= 1000) {
    return (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kg";
  }
  return Math.round(g) + "g";
}
