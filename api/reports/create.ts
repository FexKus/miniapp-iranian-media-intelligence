import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb } from "../../lib/firebaseAdmin.js";
import { Inngest } from "inngest";
import { randomUUID } from "crypto";
import { Timestamp } from "firebase-admin/firestore";

export const config = {
  runtime: "nodejs",
};

const inngest = new Inngest({ id: "iranian-media-intelligence" });

async function requireUserId(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const userId = await requireUserId(req);
    const payload = req.body;

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
      return res.status(400).send("Missing required fields");
    }

    const db = getAdminDb();
    const reportsRef = db.collection("users").doc(userId).collection("reports");

    const existingSnap = await reportsRef
      .where("idempotencyKey", "==", idempotencyKey)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0];
      return res.status(200).json({
        reportId: existing.id,
        status: existing.get("status") || "pending",
      });
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

    return res.status(200).json({ reportId, status: "pending" });
  } catch (error: any) {
    console.error("Create report failed", error);
    return res.status(500).send(error?.message || "Internal Server Error");
  }
}
