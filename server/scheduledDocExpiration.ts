import type { Request, Response } from "express";
import { getDocumentsExpiringWithinDays, getExpiredDocuments } from "./db";
import { notifyOwner } from "./_core/notification";

/**
 * Scheduled handler: checks for documents expiring within 30 days
 * and documents already expired, then sends a notification to the owner.
 * 
 * Mounted at POST /api/scheduled/checkDocExpiration
 * Triggered daily by Heartbeat cron.
 */
export async function checkDocExpirationHandler(req: Request, res: Response) {
  try {
    // Get documents expiring within 30 days
    const expiringDocs = await getDocumentsExpiringWithinDays(30);
    // Get already expired documents
    const expiredDocs = await getExpiredDocuments();

    // If nothing to report, return early
    if (expiringDocs.length === 0 && expiredDocs.length === 0) {
      return res.json({ ok: true, message: "Nenhum documento próximo do vencimento ou vencido." });
    }

    // Build notification content
    let content = "";

    if (expiredDocs.length > 0) {
      content += `🔴 **${expiredDocs.length} DOCUMENTO(S) VENCIDO(S):**\n\n`;
      for (const doc of expiredDocs) {
        const expDate = doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString("pt-BR") : "N/A";
        content += `• ${doc.title} — Venceu em ${expDate}\n`;
      }
      content += "\n";
    }

    if (expiringDocs.length > 0) {
      content += `⚠️ **${expiringDocs.length} DOCUMENTO(S) VENCENDO EM ATÉ 30 DIAS:**\n\n`;
      for (const doc of expiringDocs) {
        const expDate = doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString("pt-BR") : "N/A";
        const daysLeft = doc.expirationDate
          ? Math.ceil((new Date(doc.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
        content += `• ${doc.title} — Vence em ${expDate} (${daysLeft} dias)\n`;
      }
    }

    content += "\n\nAcesse a aba Documentação do sistema para enviar as renovações.";

    const title = `Alerta de Documentos: ${expiredDocs.length} vencido(s), ${expiringDocs.length} a vencer`;

    await notifyOwner({ title, content });

    return res.json({
      ok: true,
      expired: expiredDocs.length,
      expiring: expiringDocs.length,
      notified: true,
    });
  } catch (error: any) {
    console.error("[Scheduled] checkDocExpiration error:", error);
    return res.status(500).json({
      error: error.message || "Unknown error",
      stack: error.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
