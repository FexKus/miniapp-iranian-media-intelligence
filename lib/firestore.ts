import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase";
import { MediaSource, Report, WatchlistItem } from "../types";

const REPORT_TTL_DAYS = 7;

function toMillis(ts?: Timestamp | null): number | undefined {
  return ts ? ts.toMillis() : undefined;
}

function asWatchlistItem(id: string, data: any): WatchlistItem {
  return {
    id,
    topic: data.topic || "",
    description: data.description || "",
    persianQuery: data.persianQuery || undefined,
    timeRange: data.timeRange || undefined,
    customStartDate: data.customStartDate || undefined,
    customEndDate: data.customEndDate || undefined,
  };
}

function asSource(id: string, data: any): MediaSource {
  return {
    id,
    domain: data.domain || "",
    name: data.name || "",
    leaning: data.leaning,
    active: Boolean(data.active),
    description: data.description || undefined,
  };
}

function asReport(id: string, data: any): Report {
  const createdAt = toMillis(data.createdAt);
  return {
    id,
    watchlistItemId: data.watchlistItemId,
    topic: data.topic,
    timestamp: createdAt || Date.now(),
    status: data.status || "pending",
    stage: data.stage || "Pending",
    persianQuery: data.persianQuery || undefined,
    domains: data.domains || undefined,
    domainLeanings: data.domainLeanings || undefined,
    timeRange: data.timeRange || undefined,
    customStartDate: data.customStartDate || undefined,
    customEndDate: data.customEndDate || undefined,
    idempotencyKey: data.idempotencyKey || undefined,
    summary: data.summary || undefined,
    articles: Array.isArray(data.articleLinks)
      ? data.articleLinks.map((a: any) => ({
          title: a.title,
          url: a.url,
          domain: a.domain,
          publishedDate: a.publishedDate || undefined,
          text: a.text || "",
          evidenceQuality: a.evidenceQuality,
        }))
      : [],
    error: data.error || undefined,
    searchWarning: data.searchWarning || undefined,
    searchDiagnostics: data.searchDiagnostics || undefined,
    coverage: data.coverage || undefined,
    queryWarnings: data.queryWarnings || undefined,
    verifierWarnings: data.verifierWarnings || undefined,
    consistencyWarnings: data.consistencyWarnings || undefined,
    evaluatorResult: data.evaluatorResult || undefined,
    saved: Boolean(data.saved),
    createdAt: createdAt,
    updatedAt: toMillis(data.updatedAt),
    expiresAt: toMillis(data.expiresAt),
  };
}

function reportExpiresAt(saved: boolean): Timestamp | null {
  if (saved) return null;
  const expires = new Date();
  expires.setDate(expires.getDate() + REPORT_TTL_DAYS);
  return Timestamp.fromDate(expires);
}

// =========================
// Watchlist
// =========================

export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  const ref = collection(getFirestoreDb(), "users", userId, "watchlist");
  const snap = await getDocs(query(ref, orderBy("createdAt", "asc")));
  return snap.docs.map((d) => asWatchlistItem(d.id, d.data()));
}

export function subscribeToWatchlist(userId: string, callback: (items: WatchlistItem[]) => void) {
  const ref = collection(getFirestoreDb(), "users", userId, "watchlist");
  const q = query(ref, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => asWatchlistItem(d.id, d.data())));
  });
}

export async function addWatchlistItem(userId: string, item: Omit<WatchlistItem, "id">): Promise<string> {
  const ref = collection(getFirestoreDb(), "users", userId, "watchlist");
  const docRef = await addDoc(ref, {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateWatchlistItem(
  userId: string,
  id: string,
  updates: Partial<WatchlistItem>
): Promise<void> {
  const ref = doc(getFirestoreDb(), "users", userId, "watchlist", id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteWatchlistItem(userId: string, id: string): Promise<void> {
  const ref = doc(getFirestoreDb(), "users", userId, "watchlist", id);
  await deleteDoc(ref);
}

// =========================
// Sources
// =========================

export async function getSources(userId: string): Promise<MediaSource[]> {
  const ref = collection(getFirestoreDb(), "users", userId, "sources");
  const snap = await getDocs(query(ref, orderBy("createdAt", "asc")));
  return snap.docs.map((d) => asSource(d.id, d.data()));
}

export function subscribeToSources(userId: string, callback: (items: MediaSource[]) => void) {
  const ref = collection(getFirestoreDb(), "users", userId, "sources");
  const q = query(ref, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => asSource(d.id, d.data())));
  });
}

export async function addSource(userId: string, source: Omit<MediaSource, "id">): Promise<string> {
  const ref = collection(getFirestoreDb(), "users", userId, "sources");
  const docRef = await addDoc(ref, {
    ...source,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateSource(userId: string, id: string, updates: Partial<MediaSource>): Promise<void> {
  const ref = doc(getFirestoreDb(), "users", userId, "sources", id);
  await updateDoc(ref, updates);
}

export async function deleteSource(userId: string, id: string): Promise<void> {
  const ref = doc(getFirestoreDb(), "users", userId, "sources", id);
  await deleteDoc(ref);
}

// =========================
// Reports
// =========================

export function subscribeToReports(
  userId: string,
  callback: (items: Report[]) => void
): () => void {
  const ref = collection(getFirestoreDb(), "users", userId, "reports");
  const q = query(ref, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => asReport(d.id, d.data())));
  });
}

export function subscribeToReport(
  userId: string,
  reportId: string,
  callback: (report: Report | null) => void
): () => void {
  const ref = doc(getFirestoreDb(), "users", userId, "reports", reportId);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? asReport(snap.id, snap.data()) : null);
  });
}

export async function getReport(userId: string, reportId: string): Promise<Report | null> {
  const ref = doc(getFirestoreDb(), "users", userId, "reports", reportId);
  const snap = await getDoc(ref);
  return snap.exists() ? asReport(snap.id, snap.data()) : null;
}

export async function toggleReportSaved(userId: string, reportId: string, saved: boolean): Promise<void> {
  const ref = doc(getFirestoreDb(), "users", userId, "reports", reportId);
  await updateDoc(ref, {
    saved,
    expiresAt: reportExpiresAt(saved),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteReport(userId: string, reportId: string): Promise<void> {
  const ref = doc(getFirestoreDb(), "users", userId, "reports", reportId);
  await deleteDoc(ref);
}
