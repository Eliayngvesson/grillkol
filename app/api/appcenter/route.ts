import { NextResponse } from "next/server";
import { parseRequest, verifySignature } from "@/lib/appcenter-protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "lokal";

// Grillkol är en beställningsapp utan kundkonton eller abonnemang (billing_enabled=false i AppCenter). AppCenter får därför bara
// ping/stats (driftkontroll). Kundoperationer ger tomt svar eller nekas – ingen åtkomst kan ändras.
// Autentisering: HMAC-SHA256 över "<tidsstämpel>.<kropp>". Utan hemlighet svarar routen 503.
export async function POST(request: Request) {
  const secrets = [process.env.APPCENTER_SHARED_SECRET, process.env.APPCENTER_SHARED_SECRET_PREVIOUS]
    .filter((s): s is string => !!s);
  if (secrets.length === 0) return NextResponse.json({ error: "Ej konfigurerad." }, { status: 503 });

  const body = await request.text();
  if (body.length > 10_000) return NextResponse.json({ error: "För stor." }, { status: 413 });

  const ok = verifySignature({
    secrets,
    timestamp: request.headers.get("x-ac-timestamp"),
    signature: request.headers.get("x-ac-signature"),
    body,
  });
  if (!ok) return NextResponse.json({ error: "Ogiltig signatur." }, { status: 401 });

  let json: unknown;
  try { json = JSON.parse(body); } catch { json = null; }
  const req = parseRequest(json);
  if (!req) return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });

  switch (req.op) {
    case "ping":
      return NextResponse.json({ app: "grillkol", version: VERSION, time: new Date().toISOString() });
    case "stats":
      return NextResponse.json({
        customers: 0, trial: 0, trial_expired: 0, active: 0, past_due: 0, free: 0, blocked: 0, version: VERSION,
      });
    case "list_customers":
      return NextResponse.json({ customers: [] });
    case "get_customer":
      return NextResponse.json({ error: "Hittades inte." }, { status: 404 });
    case "set_access":
      return NextResponse.json({ error: "Grillkol har inga abonnemang." }, { status: 409 });
  }
}
