/** Gabung className secara kondisional (pengganti clsx sederhana). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return DATE_FMT.format(d);
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DATE_FMT.format(d)}, ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return formatDate(iso);
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Jarak haversine antara dua koordinat, dalam kilometer. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(km: number): string {
  if (km < 1)
    return `±${Math.max(10, Math.round((km * 1000) / 10) * 10)} meter`;
  return `±${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function formatHoursDiff(hours: number): string {
  const abs = Math.abs(hours);
  if (abs < 1) return `${Math.max(1, Math.round(abs * 60))} menit`;
  if (abs < 48) return `${Math.round(abs)} jam`;
  return `${Math.round(abs / 24)} hari`;
}

/** Normalisasi vektor ke panjang 1 (embedding Gemini terpotong tidak ternormalisasi). */
export function l2normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // asumsikan sudah dinormalisasi
}

const STOPWORDS = new Set([
  "yang",
  "di",
  "ke",
  "dari",
  "dan",
  "atau",
  "dengan",
  "ada",
  "itu",
  "ini",
  "saya",
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "at",
  "and",
  "or",
  "with",
  "is",
  "was",
  "my",
  "sekitar",
  "dekat",
  "daerah",
  "area",
  "near",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Kemiripan teks deterministik (fallback non-AI): kombinasi Jaccard token
 * dan containment (overlap relatif terhadap teks terpendek).
 */
export function textSimilarity(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  if (!a || !b) return 0;
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = inter / (ta.size + tb.size - inter);
  const containment = inter / Math.min(ta.size, tb.size);
  return Math.min(1, jaccard * 0.5 + containment * 0.5);
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Gabungkan date (YYYY-MM-DD) + time (HH:mm[:ss] | null) menjadi Date lokal. */
export function combineDateTime(date: string, time: string | null): Date {
  const t = time ? time.slice(0, 5) : "12:00";
  return new Date(`${date}T${t}:00`);
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
