"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, FieldError, Help, Input, Label } from "@/components/ui";
import {
  changePasswordAction,
  updateProfileAction,
} from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/types";

function useToastOnResult(state: ActionResult | null) {
  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) toast.success(state.message);
    else if (!state.ok && state.error) toast.error(state.error);
  }, [state]);
}

export function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string | null;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    null,
  );
  useToastOnResult(state);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="p_email">Email</Label>
        <Input id="p_email" value={email} disabled />
        <Help>Email dipakai untuk login dan tidak dapat diubah.</Help>
      </div>
      <div>
        <Label htmlFor="full_name">Nama lengkap</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          required
        />
        <FieldError error={state?.fieldErrors?.full_name} />
      </div>
      <div>
        <Label htmlFor="phone" optional>
          Nomor telepon
        </Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={phone ?? ""}
          placeholder="08xxxxxxxxxx"
        />
        <Help>
          Privat — tidak pernah ditampilkan ke pengguna lain, bahkan setelah
          klaim disetujui.
        </Help>
        <FieldError error={state?.fieldErrors?.phone} />
      </div>
      <Button type="submit" loading={pending}>
        Simpan Profil
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    null,
  );
  useToastOnResult(state);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="current_password">Password saat ini</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Help>
          Dibutuhkan untuk memastikan hanya kamu yang bisa mengganti password.
        </Help>
        <FieldError error={state?.fieldErrors?.current_password} />
      </div>
      <div>
        <Label htmlFor="new_password">Password baru</Label>
        <Input
          id="new_password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          required
        />
        <FieldError error={state?.fieldErrors?.password} />
      </div>
      <div>
        <Label htmlFor="confirm_password">Konfirmasi password baru</Label>
        <Input
          id="confirm_password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError error={state?.fieldErrors?.confirm} />
      </div>
      <Button type="submit" variant="secondary" loading={pending}>
        Ganti Password
      </Button>
    </form>
  );
}
