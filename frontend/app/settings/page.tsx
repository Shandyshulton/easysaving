"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BellRing, ChevronRight, KeyRound, LogOut, Mail, Save, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionFeedback, useActionFeedback } from "@/components/ui/action-feedback";
import { endpoints } from "@/services/api/easysaving";
import { clearToken, setStoredUser } from "@/services/api/client";

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["profile"], queryFn: endpoints.profile });
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPassword, setOtpPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const feedback = useActionFeedback();

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: () => endpoints.updateProfile({ name }),
    onSuccess: (updated) => {
      setStoredUser(updated);
      queryClient.setQueryData(["profile"], updated);
      feedback.showSuccess("Profile tersimpan", "Nama profile berhasil diperbarui.");
    },
    onError: (error) => feedback.showError("Gagal menyimpan profile", (error as Error).message)
  });

  const savePassword = useMutation({
    mutationFn: () => endpoints.updatePassword({ current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      feedback.showSuccess("Password diperbarui", "Gunakan password baru untuk login berikutnya.");
    },
    onError: (error) => feedback.showError("Gagal mengganti password", (error as Error).message)
  });

  const sendResetOTP = useMutation({
    mutationFn: () => endpoints.forgotPassword({ email: user?.email ?? "" }),
    onSuccess: () => {
      setOtpSent(true);
      feedback.showSuccess("OTP dikirim", "Cek email terdaftar untuk kode reset password.");
    },
    onError: (error) => feedback.showError("Gagal mengirim OTP", (error as Error).message)
  });

  const resetPasswordWithOTP = useMutation({
    mutationFn: () => endpoints.resetPassword({ email: user?.email ?? "", otp, new_password: otpPassword }),
    onSuccess: () => {
      setOtp("");
      setOtpPassword("");
      setOtpSent(false);
      feedback.showSuccess("Password diperbarui", "Password akun berhasil diganti lewat OTP.");
    },
    onError: (error) => feedback.showError("Reset password gagal", (error as Error).message)
  });

  return (
    <AppShell>
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <div className="mb-8">
        <p className="text-sm font-semibold text-[var(--primary-strong)]">Profile</p>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">Settings</h1>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--income-soft)] text-lg font-black text-[var(--primary-strong)]">
                {(name || user?.name || "ES").trim().split(/\s+/).slice(0, 2).map((item) => item[0]).join("").toUpperCase()}
              </span>
              <div>
                <div className="mb-1 flex items-center gap-2 text-[var(--primary-strong)]">
                  <UserRound size={20} />
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Edit Profile</h2>
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">Ubah nama dan password akun. Email dibuat tetap agar identitas login tidak berubah.</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                clearToken();
                queryClient.clear();
                router.push("/auth");
              }}
              className="rounded-full bg-[var(--surface-muted)] text-[var(--expense)] shadow-none hover:bg-[var(--expense-soft)]"
            >
              <LogOut size={18} />
              Logout
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Nama</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                  placeholder="Nama pengguna"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Email</span>
                <input
                  value={user?.email ?? ""}
                  readOnly
                  className="h-12 w-full cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-secondary)] outline-none"
                />
              </label>
              <Button
                type="button"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending || name.trim().length < 2}
                className="rounded-full bg-[var(--primary-strong)] hover:bg-[var(--primary)]"
              >
                <Save size={18} />
                Simpan Profile
              </Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-strong)]">
                    <KeyRound size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Lupa password saat ini?</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">Kirim OTP ke email akun, lalu buat password baru tanpa password lama.</p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => sendResetOTP.mutate()}
                  disabled={sendResetOTP.isPending || !user?.email}
                  className="rounded-full bg-[var(--primary-strong)] hover:bg-[var(--primary)]"
                >
                  <Mail size={18} />
                  {sendResetOTP.isPending ? "Mengirim OTP..." : otpSent ? "Kirim Ulang OTP" : "Kirim OTP"}
                </Button>

                {otpSent && (
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Kode OTP</span>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold tracking-[0.2em] text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                        placeholder="123456"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Password baru</span>
                      <input
                        type="password"
                        value={otpPassword}
                        onChange={(event) => setOtpPassword(event.target.value)}
                        className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                        placeholder="Minimal 8 karakter"
                      />
                    </label>
                    <Button
                      type="button"
                      onClick={() => resetPasswordWithOTP.mutate()}
                      disabled={resetPasswordWithOTP.isPending || otp.length !== 6 || otpPassword.length < 8}
                      className="rounded-full bg-[var(--primary-strong)] hover:bg-[var(--primary)]"
                    >
                      <Save size={18} />
                      {resetPasswordWithOTP.isPending ? "Memperbarui..." : "Reset via OTP"}
                    </Button>
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Password saat ini</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                  placeholder="Password lama"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Password baru</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary-strong)] focus:ring-1 focus:ring-[var(--primary-strong)]"
                  placeholder="Minimal 8 karakter"
                />
              </label>
              <Button
                type="button"
                onClick={() => savePassword.mutate()}
                disabled={savePassword.isPending || currentPassword.length < 8 || newPassword.length < 8}
                className="rounded-full bg-[var(--primary-strong)] hover:bg-[var(--primary)]"
              >
                <Save size={18} />
                Ubah Password
              </Button>
            </div>
          </div>
        </Card>

        {/* Peringatan pengeluaran kini punya halaman sendiri */}
        <Link
          href="/settings/alerts"
          className="panel flex items-center justify-between gap-4 p-5 transition hover:border-[var(--primary-border)] hover:bg-[var(--primary-soft)] lg:col-span-2"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary-strong)]">
              <BellRing size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Peringatan Pengeluaran</p>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Atur batas pengeluaran dan lihat statusnya.</p>
            </div>
          </div>
          <ChevronRight size={20} className="shrink-0 text-[var(--text-muted)]" />
        </Link>
      </div>
    </AppShell>
  );
}
