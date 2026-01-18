import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const body = req.body ?? {};
  const { batchId, emails } = body;

  if (!batchId || !Array.isArray(emails)) {
    return res.status(400).json({
      error: "Missing batchId or emails[]"
    });
  }

  // DRY-RUN ONLY — NO SENDING
  // Gmail OAuth + draft creation will be added later
  return res.status(200).json({
    ok: true,
    mode: "DRY_RUN",
    message: "Draft creation endpoint ready. No emails sent.",
    batchId,
    draftsPrepared: emails.length
  });
}
