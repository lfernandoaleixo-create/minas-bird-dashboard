/**
 * Módulo compartilhado de estilo PDF — Criatório Minas Bird
 * Todos os PDFs do sistema devem usar estas funções para manter
 * identidade visual consistente.
 *
 * PADRÃO DE IMPRESSÃO (cozinha do criatório):
 * - Logo: SOMENTE o símbolo (sem texto "Criatório Minas Bird")
 * - Margens: 12mm (portrait) / 8mm (landscape)
 * - Fonte mínima: 7pt (nunca abaixo disso)
 * - Header: barra verde escura 16mm + linha acento
 * - Footer: data + nome criatório + paginação
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
// STANDARD MARGINS
// =============================================
export const PDF_MARGIN = {
  portrait: 12,   // mm
  landscape: 8,   // mm
};

// =============================================
// STANDARD SIZES
// =============================================
export const PDF_HEADER_H = 16;  // mm - height of green bar
export const PDF_FOOTER_H = 10;  // mm - reserved footer space
export const PDF_ACCENT_H = 1.2; // mm - accent line below header

// =============================================
// MINIMUM FONT SIZES (for print legibility)
// =============================================
export const PDF_FONT = {
  title: 14,      // main title in header
  subtitle: 9,    // subtitle in header
  sectionTitle: 10, // section headers
  body: 8,        // body text
  small: 7,       // smallest allowed (notes, captions)
  // NEVER go below 7pt
};

// =============================================
// LOGO LOADER (real logo image — symbol only)
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
// SHARED HEADER — green bar + logo (symbol only) + title
// Returns the Y position after the header
//
// Layout:
//   [LOGO 14x14]  [TITLE centered]  [RIGHT INFO optional]
//   No "Criatório Minas Bird" text next to logo
// =============================================
export function drawBrandHeader(
  doc: jsPDF,
  pageW: number,
  logoBase64: string | null,
  title: string,
  subtitle: string,
  options?: { rightTitle?: string; rightSubtitle?: string },
): number {
  const barH = PDF_HEADER_H;

  // Dark green bar
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, barH, "F");

  // Logo — symbol only, no text beside it
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", 4, 1, 14, 14); } catch { /* skip */ }
  }

  // Title — centered in the bar
  doc.setFontSize(PDF_FONT.title);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW / 2, barH * 0.42, { align: "center" });

  // Subtitle — below title, centered
  if (subtitle) {
    doc.setFontSize(PDF_FONT.subtitle);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 230, 210);
    doc.text(subtitle, pageW / 2, barH * 0.75, { align: "center" });
  }

  // Right side info (optional)
  if (options?.rightTitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(options.rightTitle, pageW - 8, barH * 0.42, { align: "right" });
  }
  if (options?.rightSubtitle) {
    doc.setFontSize(PDF_FONT.small);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 230, 210);
    doc.text(options.rightSubtitle, pageW - 8, barH * 0.75, { align: "right" });
  }

  // Accent line
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, barH, pageW, PDF_ACCENT_H, "F");

  return barH + PDF_ACCENT_H + 4;
}

// =============================================
// SHARED FOOTER — date + criatório name + page
// Consistent across ALL PDFs
// =============================================
export function drawBrandFooter(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  pageNum?: number,
  totalPages?: number,
): void {
  const margin = pageW > 250 ? PDF_MARGIN.landscape : PDF_MARGIN.portrait;
  const fy = pageH - 7;

  // Separator line
  doc.setDrawColor(...BRAND.medium);
  doc.setLineWidth(0.3);
  doc.line(margin, fy - 2.5, pageW - margin, fy - 2.5);

  // Date (left)
  const now = new Date();
  const ds = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
  doc.setFontSize(PDF_FONT.small);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`Publicado em ${ds}`, margin, fy);

  // Center name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.dark);
  doc.text("Criatório Minas Bird — Ribeirão Vermelho, MG", pageW / 2, fy, { align: "center" });

  // Page number (right)
  if (pageNum !== undefined && totalPages !== undefined) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FONT.small);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, fy, { align: "right" });
  }
}

// =============================================
// FOOD NAME CLEANING
// =============================================
const SUFFIX_PATTERN = /[,;]\s*(?:Crua?|Cozid[ao]|Assad[ao]|com\s+[Cc]asca|sem\s+[Cc]asca|Fresc[ao]|Sec[ao]|Inteira?o?|Madur[ao]|Verde|Natural|em\s+Pó|Desidratad[ao]|Moíd[ao]|Triturad[ao]|Ralad[ao]|Picad[ao]|Fatiado|em\s+Flocos|em\s+Grãos|em\s+Pedaços)\s*$/gi;
const DASH_SUFFIX = /\s*[-–]\s*(?:Crua?|Cozid[ao]|Assad[ao]|com\s+[Cc]asca|sem\s+[Cc]asca|Fresc[ao]|Sec[ao]|Inteira?o?|Madur[ao]|Verde|Natural|em\s+Pó|Desidratad[ao]|Moíd[ao]|Triturad[ao]|Ralad[ao]|Picad[ao]|Fatiado|em\s+Flocos|em\s+Grãos|em\s+Pedaços)/gi;

export function cleanFoodName(raw: string): string {
  let name = raw;
  let prev = "";
  while (prev !== name) {
    prev = name;
    name = name.replace(SUFFIX_PATTERN, "").trim();
  }
  name = name.replace(DASH_SUFFIX, "").trim();
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
