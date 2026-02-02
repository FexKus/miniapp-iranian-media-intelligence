import { getAdminAuth, getAdminDb } from "../../lib/firebaseAdmin";
import { Inngest } from "inngest";
import { randomUUID } from "crypto";
import { Timestamp } from "firebase-admin/firestore";

export const config = {
  runtime: "nodejs",
};

const inngest = new Inngest({ id: "iranian-media-intelligence" });

async function requireUserId(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization");
  }
  const token = authHeader.replace("Bearer ", "");
  const decoded = await getAdminAuth().verifyIdToken(token);
  return decoded.uid;
}

function computeExpiresAt(saved: boolean): Timestamp | null {
  if (saved) return null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return Timestamp.fromDate(expiresAt);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const userId = await requireUserId(req);
    const payload = await req.json();

    const {
      watchlistItemId,
      topic,
      persianQuery,
      domains,
      domainLeanings,
      timeRange,
      customStartDate,
      customEndDate,
      idempotencyKey,
    } = payload || {};

    if (!watchlistItemId || !topic || !Array.isArray(domains) || !idempotencyKey) {
      return new Response("Missing required fields", { status: 400 });
    }

    const db = getAdminDb();
    const reportsRef = db.collection("users").doc(userId).collection("reports");

    const existingSnap = await reportsRef
      .where("idempotencyKey", "==", idempotencyKey)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0];
      return new Response(
        JSON.stringify({ reportId: existing.id, status: existing.get("status") || "pending" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = Timestamp.now();
    const reportId = randomUUID();
    await reportsRef.doc(reportId).set({
      watchlistItemId,
      topic,
      persianQuery: persianQuery || null,
      domains,
      domainLeanings: domainLeanings || {},
      timeRange: timeRange || "last7d",
      customStartDate: customStartDate || null,
      customEndDate: customEndDate || null,
      idempotencyKey,
      status: "pending",
      stage: "Queued",
      saved: false,
      createdAt: now,
      updatedAt: now,
      expiresAt: computeExpiresAt(false),
      articleLinks: [],
    });

    await inngest.send({
      name: "reports/analyze",
      data: {
        userId,
        reportId,
      },
    });

    return new Response(JSON.stringify({ reportId, status: "pending" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Create report failed", error);
    return new Response(error?.message || "Internal Server Error", { status: 500 });
  }
}
