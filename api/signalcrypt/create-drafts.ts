export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.json({ error: "POST only" });
  }

  const body = req.body ?? {};
  const { batchId, emails } = body;

  if (!batchId || !Array.isArray(emails)) {
    res.statusCode = 400;
    return res.json({ error: "Missing batchId or emails[]" });
  }

  // DRY-RUN ONLY — NO SENDING, NO DRAFTS YET
  return res.json({
    ok: true,
    mode: "DRY_RUN",
    message: "Draft creation endpoint ready. No emails sent.",
    batchId,
    draftsPrepared: emails.length,
  });
}
