import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as any)[0] as string;
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Check if the request wants inline viewing (for iframe embedding)
      const inline = req.query.inline === "1";

      if (inline) {
        // Stream the content directly to avoid cross-origin iframe blocking
        const fileResp = await fetch(url);
        if (!fileResp.ok) {
          res.status(502).send("Failed to fetch file from storage");
          return;
        }
        const contentType = fileResp.headers.get("content-type") || "application/octet-stream";
        res.set("Content-Type", contentType);
        res.set("Cache-Control", "public, max-age=3600");
        res.set("Content-Disposition", "inline");
        // Remove any X-Frame-Options to allow iframe embedding
        res.removeHeader("X-Frame-Options");

        const buffer = await fileResp.arrayBuffer();
        res.send(Buffer.from(buffer));
      } else {
        // Default: redirect (for direct download/print in new tab)
        res.set("Cache-Control", "no-store");
        res.redirect(307, url);
      }
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
