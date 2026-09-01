// Fallback heuristik non-AI: dipakai bila GEMINI_API_KEY tidak tersedia
// atau request Gemini gagal. Aplikasi harus tetap berfungsi tanpa AI.

import type { Extraction } from "@/lib/types";
import { tokenize } from "@/lib/utils";

/** Kamus mini Indonesia → English canonical agar matching lintas bahasa tetap jalan tanpa AI. */
const ID_EN: Record<string, string> = {
  // items
  dompet: "wallet",
  tas: "bag",
  ransel: "backpack",
  kunci: "keys",
  handphone: "phone",
  hp: "phone",
  ponsel: "phone",
  smartphone: "phone",
  jam: "watch",
  kacamata: "glasses",
  payung: "umbrella",
  buku: "book",
  jaket: "jacket",
  topi: "hat",
  cincin: "ring",
  kalung: "necklace",
  gelang: "bracelet",
  botol: "bottle",
  kartu: "card",
  helm: "helmet",
  sepatu: "shoes",
  sandal: "sandals",
  flashdisk: "flashdrive",
  powerbank: "powerbank",
  laptop: "laptop",
  tablet: "tablet",
  earphone: "earphones",
  headset: "earphones",
  charger: "charger",
  ktp: "idcard",
  sim: "license",
  stnk: "vehicle-document",
  // colors
  hitam: "black",
  putih: "white",
  merah: "red",
  biru: "blue",
  hijau: "green",
  kuning: "yellow",
  coklat: "brown",
  cokelat: "brown",
  abu: "gray",
  ungu: "purple",
  pink: "pink",
  jingga: "orange",
  oranye: "orange",
  emas: "gold",
  perak: "silver",
  krem: "cream",
  toska: "teal",
  "abu-abu": "gray",
  muda: "light",
  tua: "dark",
  // materials
  kulit: "leather",
  kain: "fabric",
  plastik: "plastic",
  logam: "metal",
  besi: "metal",
  kanvas: "canvas",
  karet: "rubber",
  denim: "denim",
  stainless: "stainless",
  // feature words
  gantungan: "keychain",
  stiker: "sticker",
  goresan: "scratch",
  tergores: "scratch",
  retak: "crack",
  pecah: "crack",
  tulisan: "writing",
  huruf: "letter",
  angka: "number",
  resleting: "zipper",
  tali: "strap",
  casing: "case",
  sarung: "case",
  foto: "photo",
  nama: "name",
  inisial: "initial",
  bentuk: "shape",
  motif: "pattern",
  garis: "stripe",
  logo: "logo",
  lecet: "scratch",
  patah: "broken",
  robek: "torn",
  sobek: "torn",
  kecil: "small",
  besar: "big",
  wallpaper: "wallpaper",
  lanyard: "lanyard",
};

export function translateTokens(text: string | null | undefined): string {
  if (!text) return "";
  return tokenize(text)
    .map((t) => ID_EN[t] ?? t)
    .join(" ");
}

function splitFeatures(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[,;\n•·]+/)
    .map((f) => translateTokens(f))
    .filter((f) => f.length > 1)
    .slice(0, 8);
}

interface FallbackInput {
  item_name: string;
  category: string;
  color: string | null;
  brand: string | null;
  model: string | null;
  material: string | null;
  description: string;
  unique_features: string | null;
}

/** Ekstraksi atribut deterministik: normalisasi field mentah + terjemahan kamus. */
export function fallbackExtraction(input: FallbackInput): Extraction {
  const itemTokens = translateTokens(input.item_name);
  const descTokens = translateTokens(input.description);
  const keywords = Array.from(
    new Set(
      [...itemTokens.split(" "), ...descTokens.split(" ")].filter(
        (t) => t.length > 2,
      ),
    ),
  ).slice(0, 12);

  return {
    item_type:
      input.category !== "other"
        ? input.category
        : itemTokens.split(" ")[0] || null,
    category: input.category,
    color: input.color
      ? translateTokens(input.color).split(" ")[0] || null
      : null,
    color_secondary: null,
    brand: input.brand?.trim().toLowerCase() || null,
    model: input.model?.trim().toLowerCase() || null,
    material: input.material
      ? translateTokens(input.material).split(" ")[0] || null
      : null,
    unique_features: splitFeatures(input.unique_features),
    keywords,
    normalized_description: `${itemTokens} ${descTokens}`.trim() || null,
  };
}
