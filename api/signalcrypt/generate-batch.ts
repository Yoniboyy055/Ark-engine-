// api/signalcrypt/generate-batch.ts

type Angle = "trust" | "compliance" | "risk" | "speed" | "authority";
type OfferName = "Flash Breach" | "War Room" | "Retainer";

function isoNow() {
  return new Date().toISOString();
}

function slugDate(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildTemplateTargets(count: number) {
  // IMPORTANT: we do NOT fabricate emails.
  // This returns placeholders so you can plug in a real "finder" later (search API / enrichment).
  return Array.from({ length: count }).map((_, i) => ({
    name: `Target ${i + 1}`,
    website: "",
    whySelected:
      "Fits: B2B SaaS, North America, ~10–200 employees, makes security/trust/privacy/compliance/uptime claims (needs verification).",
    channel: "email",
    email: "",
    dmHandle: "",
    notes: "needs discovery/enrichment",
  }));
}

function makeBatch() {
  const preparedAt = isoNow();
  const batchId = `SC-${slugDate(new Date())}`;

  const offer: { name: OfferName; price: string } = {
    name: "War Room",
    price: "$1,000",
  };

  const angle: Angle = "risk";

  return {
    batchId,
    preparedAt,
    limits: { email: 15, dm: 3 },
    discoveryRule:
      "B2B SaaS companies in North America with 10–200 employees that publicly make security, trust, privacy, compliance, or uptime claims on their website.",
    offer,
    angle,
    targets: buildTemplateTargets(15),
    email: {
      subjectA: "Quick question about your trust & security claims",
      body1:
        "Hey {{firstName}},\n\nI'm reaching out because {{company}} publicly positions around trust/security/privacy.\n\nSignalCrypt is a fast "Breach Suite" that spots where trust breaks (messaging + compliance signals + exposure surfaces) and returns a clear fix list.\n\nIf I ran a quick pass and sent you 3 specific findings, would you want them?\n\n— {{yourName}}\nSignalCrypt",
      body2:
        "Hey {{firstName}},\n\nQuick follow-up — do you want the 3 findings pass for {{company}}?\nIf yes, tell me who should receive it.\n\n— {{yourName}}",
      followUpDelayDays: 4,
    },
    dm: {
      message:
        "Hey {{firstName}} — I emailed you a quick note about a 3-finding trust/security pass for {{company}}. Want me to send it over?",
      maxTargets: 3,
      eligibilityRule:
        "only after no reply to email sequence OR clearly DM-first",
    },
    executionPlan: {
      schedule: [
        { day: "Day 0", action: "Send Email #1 to all email targets" },
        { day: "Day 4", action: "Send Email #2 only to non-responders" },
      ],
      stopConditions: ["any reply", "unsubscribe", "bounce", "manual pause"],
    },
    risks: ["deliverability", "brand risk", "rate limits"],
    safeguards: ["low volume", "honest messaging", "approval gate"],
    approval: { status: "PENDING", approvedBy: "", approvedAt: "" },
  };
}

export function GET() {
  // Cron Jobs trigger with GET requests.
  return Response.json(makeBatch(), { status: 200 });
}

export async function POST(req: Request) {
  // Allows manual button click in the app.
  // You can later accept filters in body (industry, region overrides, etc).
  void req; // keep lint happy
  return Response.json(makeBatch(), { status: 200 });
}
