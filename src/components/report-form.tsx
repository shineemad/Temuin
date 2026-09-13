"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, LocateFixed, ShieldAlert, Sparkles, X } from "lucide-react";
import {
  Button,
  Card,
  FieldError,
  Help,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { CATEGORIES } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

type ReportAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

export function ReportForm({
  type,
  action,
  isAuthenticated = true,
  loginHref = "/login",
}: {
  type: "LOST" | "FOUND";
  action: ReportAction;
  isAuthenticated?: boolean;
  loginHref?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = `temuin_draft_${type}`;

  // Pulihkan draft yang disimpan saat pengguna diminta login sebelum submit.
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, string>;
      const form = formRef.current;
      if (form) {
        for (const [name, value] of Object.entries(draft)) {
          const el = form.elements.namedItem(name);
          if (
            el instanceof HTMLInputElement ||
            el instanceof HTMLTextAreaElement ||
            el instanceof HTMLSelectElement
          ) {
            el.value = value;
          }
        }
      }
      sessionStorage.removeItem(draftKey);
      toast.success("Isian laporanmu sebelumnya dipulihkan.");
    } catch {
      // draft korup — abaikan
    }
  }, [isAuthenticated, draftKey]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (isAuthenticated) return; // biarkan server action berjalan normal
    e.preventDefault();
    const draft: Record<string, string> = {};
    for (const [k, v] of new FormData(e.currentTarget).entries()) {
      if (k !== "image" && typeof v === "string") draft[k] = v;
    }
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // storage penuh/diblokir — lanjut saja ke login
    }
    toast.info("Masuk dulu untuk mengirim. Isianmu disimpan sementara.");
    router.push(loginHref);
  }

  const isLost = type === "LOST";
  const err = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state && !state.ok) {
      if (state.error) toast.error(state.error);
      else if (state.fieldErrors)
        toast.error("Periksa kembali isian formulir.");
    }
  }, [state]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPreview(null);
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5MB.");
      e.target.value = "";
      return setPreview(null);
    }
    setPreview(URL.createObjectURL(file));
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolocation.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Koordinat lokasi ditambahkan.");
      },
      () => {
        setLocating(false);
        toast.error(
          "Tidak bisa mengambil lokasi. Isi nama lokasi saja — itu sudah cukup.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-900 uppercase">
          Informasi Barang
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="item_name">Nama barang</Label>
            <Input
              id="item_name"
              name="item_name"
              placeholder={
                isLost
                  ? "Contoh: Dompet Eiger hitam"
                  : "Contoh: Dompet kulit hitam"
              }
              required
            />
            <FieldError error={err.item_name} />
          </div>
          <div>
            <Label htmlFor="category">Kategori</Label>
            <Select id="category" name="category" defaultValue="" required>
              <option value="" disabled>
                Pilih kategori…
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <FieldError error={err.category} />
          </div>
          <div>
            <Label htmlFor="color">Warna</Label>
            <Input id="color" name="color" placeholder="Contoh: Hitam" />
            <FieldError error={err.color} />
          </div>
          <div>
            <Label htmlFor="brand" optional>
              Brand / Merek
            </Label>
            <Input id="brand" name="brand" placeholder="Contoh: Eiger" />
            <FieldError error={err.brand} />
          </div>
          <div>
            <Label htmlFor="model" optional>
              Model / Tipe
            </Label>
            <Input
              id="model"
              name="model"
              placeholder="Contoh: Dompet lipat dua"
            />
            <FieldError error={err.model} />
          </div>
          <div>
            <Label htmlFor="material" optional>
              Material
            </Label>
            <Input id="material" name="material" placeholder="Contoh: Kulit" />
            <FieldError error={err.material} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder={
                isLost
                  ? "Ceritakan barang Anda senatural mungkin. Contoh: Saya kehilangan dompet Eiger hitam dekat food court sekitar jam 7 malam. Ada gantungan huruf A."
                  : "Deskripsikan barang yang Anda temukan. Contoh: Dompet hitam ditemukan dekat food court, terdapat gantungan berbentuk huruf A."
              }
              required
            />
            <Help>
              <Sparkles className="mr-1 inline size-3 text-brand-500" />
              AI Temuin akan mengekstrak ciri barang dari deskripsi ini — bahasa
              Indonesia maupun Inggris sama-sama dipahami.
            </Help>
            <FieldError error={err.description} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="unique_features" optional={!isLost}>
              Ciri khusus
            </Label>
            <Textarea
              id="unique_features"
              name="unique_features"
              rows={2}
              placeholder="Contoh: gantungan huruf A, goresan di pojok, stiker bintang"
            />
            <Help>
              Pisahkan dengan koma. Ciri unik sangat membantu akurasi
              pencocokan.
            </Help>
            <FieldError error={err.unique_features} />
          </div>
        </div>
      </Card>

      {!isLost && (
        <Card className="border-l-4 border-l-amber-400 p-5 sm:p-6">
          <div className="mb-3 flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Info Verifikasi Privat <span className="text-rose-500">*</span>
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Tulis detail yang <strong>hanya diketahui pemilik asli</strong>{" "}
                — isi dompet, tulisan/kode tertentu, stiker, goresan, wallpaper,
                dsb. Info ini{" "}
                <strong>tidak pernah ditampilkan ke publik</strong> dan hanya
                dipakai sistem untuk menguji jawaban orang yang mengklaim.
              </p>
            </div>
          </div>
          <Textarea
            id="private_verification_info"
            name="private_verification_info"
            rows={3}
            placeholder="Contoh: di dalamnya ada kartu pelajar atas nama R***, foto keluarga, dan uang sekitar 50 ribu"
            required
          />
          <FieldError error={err.private_verification_info} />
          <Help>
            Jangan tulis detail rahasia ini di kolom deskripsi di atas — cukup
            di sini.
          </Help>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-900 uppercase">
          Lokasi &amp; Waktu
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="location_name">
              {isLost ? "Lokasi terakhir terlihat" : "Lokasi ditemukan"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="location_name"
                name="location_name"
                placeholder="Contoh: Food court Mall Panakkukang, Makassar"
                className="flex-1"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={useMyLocation}
                loading={locating}
                title="Tambahkan koordinat GPS dari perangkat"
              >
                <LocateFixed className="size-4" />
                <span className="hidden sm:inline">Lokasi saya</span>
              </Button>
            </div>
            {coords && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <LocateFixed className="size-3" />
                Koordinat: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                <button
                  type="button"
                  onClick={() => setCoords(null)}
                  className="ml-1 text-emerald-500 hover:text-emerald-800"
                  aria-label="Hapus koordinat"
                >
                  <X className="size-3" />
                </button>
              </p>
            )}
            <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
            <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
            <FieldError error={err.location_name} />
          </div>
          <div>
            <Label htmlFor={isLost ? "lost_date" : "found_date"}>
              {isLost ? "Tanggal kehilangan" : "Tanggal ditemukan"}
            </Label>
            <Input
              id={isLost ? "lost_date" : "found_date"}
              name={isLost ? "lost_date" : "found_date"}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              required
            />
            <FieldError error={isLost ? err.lost_date : err.found_date} />
          </div>
          <div>
            <Label htmlFor={isLost ? "lost_time" : "found_time"} optional>
              {isLost ? "Perkiraan waktu" : "Waktu ditemukan"}
            </Label>
            <Input
              id={isLost ? "lost_time" : "found_time"}
              name={isLost ? "lost_time" : "found_time"}
              type="time"
            />
            <FieldError error={isLost ? err.lost_time : err.found_time} />
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-bold tracking-wide text-slate-900 uppercase">
          Foto Barang
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          {isLost
            ? "Opsional — tidak punya foto? Tidak masalah, AI tetap mencocokkan lewat deskripsi, lokasi, dan waktu."
            : "Sangat disarankan — foto mempermudah pemilik mengenali barangnya."}
        </p>
        {/* Input file selalu ter-mount agar file tetap ada di FormData saat preview tampil */}
        <input
          ref={fileRef}
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
        {preview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview foto barang"
              className="h-44 w-auto rounded-xl object-cover ring-1 ring-slate-200"
            />
            <button
              type="button"
              onClick={clearFile}
              className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 hover:text-rose-600"
              aria-label="Hapus foto"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <Camera className="size-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              Klik untuk pilih foto
            </span>
            <span className="text-xs text-slate-400">
              JPG, PNG, atau WebP — maks 5MB
            </span>
          </button>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3 pb-4">
        <Button
          type="submit"
          size="lg"
          loading={pending}
          variant={isLost ? "primary" : "amber"}
          className="w-full sm:w-auto"
        >
          {pending ? (
            "Mengirim laporan…"
          ) : (
            <>
              <Sparkles className="size-4" />
              {isLost ? "Kirim Laporan Kehilangan" : "Kirim Laporan Penemuan"}
            </>
          )}
        </Button>
      </div>
      {pending && (
        <p className="-mt-2 pb-6 text-right text-xs text-slate-400">
          Menyimpan laporan Anda — analisis AI berjalan otomatis setelahnya.
        </p>
      )}
    </form>
  );
}
