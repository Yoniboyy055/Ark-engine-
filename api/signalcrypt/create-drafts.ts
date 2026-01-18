import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Safety: never send email here.
  // This endpoint will create Gmail drafts after OAuth is configured.
  // For now, return the payload so you can verify the pipeline end-to-end.

  const body = req.body ?? {};
  const { batchId, emails } = body;

  if (!batchId || !Array.isArray(emails)) {
    return res.status(400).json({ error: "Missing batchId or emails[]" });
  }

  // DRY-RUN until OAuth is configured
  return res.status(200).json({
    ok: true,
    mode: "DRY_RUN",
    message: "Draft creation not configured yet. Payload accepted.",
    batchId,
    count: emails.length,
  });
}
