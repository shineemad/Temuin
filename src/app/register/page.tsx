import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth-layout";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Buat akun Temuin"
      subtitle="Gratis — laporkan barang hilang atau bantu kembalikan barang temuan."
    >
      <AuthForm mode="register" action={registerAction} />
    </AuthLayout>
  );
}
