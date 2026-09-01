"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, FieldError, Input, Label } from "@/components/ui";
import type { ActionResult } from "@/lib/types";

type AuthAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "register";
  action: AuthAction;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && !state.ok && state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "register" && (
        <div>
          <Label htmlFor="full_name">Nama Lengkap</Label>
          <Input
            id="full_name"
            name="full_name"
            placeholder="Nama Anda"
            autoComplete="name"
            required
          />
          <FieldError error={state?.fieldErrors?.full_name} />
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          required
        />
        <FieldError error={state?.fieldErrors?.email} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={
            mode === "register" ? "Minimal 8 karakter" : "Password Anda"
          }
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          required
        />
        <FieldError error={state?.fieldErrors?.password} />
      </div>

      <Button type="submit" className="w-full" size="lg" loading={pending}>
        {pending
          ? mode === "register"
            ? "Membuat akun…"
            : "Masuk…"
          : mode === "register"
            ? "Buat Akun"
            : "Masuk"}
      </Button>

      <p className="pt-1 text-center text-sm text-slate-500">
        {mode === "register" ? (
          <>
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Masuk
            </Link>
          </>
        ) : (
          <>
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Daftar gratis
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
