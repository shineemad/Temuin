import { z } from "zod";

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(80, "Nama terlalu panjang"),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password terlalu panjang"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "Terlalu panjang")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const coordinateField = (max: number, label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine(
      (v) => v === null || (!Number.isNaN(v) && Math.abs(v) <= max),
      `${label} harus berada antara -${max} dan ${max}.`,
    );

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00`);
    return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now() + 86_400_000;
  }, "Tanggal tidak boleh di masa depan");

const timeField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v === null || /^\d{2}:\d{2}$/.test(v),
    "Format waktu tidak valid",
  );

const reportBase = {
  item_name: z
    .string()
    .trim()
    .min(3, "Nama barang minimal 3 karakter")
    .max(120),
  category: z.string().trim().min(1, "Pilih kategori"),
  color: optionalTrimmed(60),
  brand: optionalTrimmed(60),
  model: optionalTrimmed(80),
  material: optionalTrimmed(60),
  description: z
    .string()
    .trim()
    .min(15, "Deskripsi minimal 15 karakter agar AI dapat menganalisis")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
  unique_features: optionalTrimmed(500),
  location_name: z.string().trim().min(3, "Lokasi wajib diisi").max(160),
  latitude: coordinateField(90, "Latitude"),
  longitude: coordinateField(180, "Longitude"),
};

export const lostReportSchema = z.object({
  ...reportBase,
  lost_date: dateField,
  lost_time: timeField,
});

export const foundReportSchema = z.object({
  ...reportBase,
  found_date: dateField,
  found_time: timeField,
  private_verification_info: z
    .string()
    .trim()
    .min(
      10,
      "Isi info verifikasi privat minimal 10 karakter — ini kunci keamanan klaim",
    )
    .max(1000),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  phone: optionalTrimmed(24).refine(
    (v) => v === null || v === undefined || /^[0-9+\-\s()]{6,24}$/.test(v),
    "Format nomor telepon tidak valid",
  ),
});

export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Pesan kosong")
    .max(2000, "Pesan terlalu panjang"),
});

/** Ubah hasil safeParse zod menjadi map error per field. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
