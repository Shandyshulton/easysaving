"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BellRing, KeyRound, LogOut, Mail, Save, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { ActionFeedback, useActionFeedback } from "@/components/ui/action-feedback";
import { useSpendingAlertSettings, type SpendingAlertPeriod } from "@/hooks/use-spending-alert";
import { endpoints } from "@/services/api/easysaving";
import { clearToken, setStoredUser } from "@/services/api/client";

const periods: Array<{ value: SpendingAlertPeriod; label: string; description: string }> = [
  { value: "daily", label: "Daily", description: "Reset setiap hari" },
  { value: "weekly", label: "Weekly", description: "Pantau minggu berjalan" },
  { value: "monthly", label: "Monthly", description: "Cocok untuk budget bulanan" }
];

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["profile"], queryFn: endpoints.profile });
  const { settings, setSettings } = useSpendingAlertSettings();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [period, setPeriod] = useState<SpendingAlertPeriod>(settings.period);
  const [limit, setLimit] = useState(settings.limit);
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

  function saveSettings() {
    const trimmedLimit = limit.trim();
    if (enabled && Number(trimmedLimit) <= 0) {
      feedback.showError("Limit belum valid", "Isi nominal batas pengeluaran lebih dari 0.");
      return;
    }

    setSettings({ enabled, period, limit: trimmedLimit });
    feedback.showSuccess("Peringatan disimpan", "Notifikasi akan muncul saat pengeluaran melewati batas.");
  }

  return (
    <AppShell>
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />
      <div className="mb-8">
        <p className="text-sm font-semibold text-[#006c49]">Profile</p>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg font-black text-[#006c49]">
                {(name || user?.name || "ES").trim().split(/\s+/).slice(0, 2).map((item) => item[0]).join("").toUpperCase()}
              </span>
              <div>
                <div className="mb-1 flex items-center gap-2 text-[#006c49]">
                  <UserRound size={20} />
                  <h2 className="text-lg font-bold text-[#0f172a]">Edit Profile</h2>
                </div>
                <p className="text-sm leading-6 text-[#64748b]">Ubah nama dan password akun. Email dibuat tetap agar identitas login tidak berubah.</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                clearToken();
                queryClient.clear();
                router.push("/auth");
              }}
              className="rounded-full bg-[#f2f4f6] text-[#a83639] shadow-none hover:bg-[#ffdad8]"
            >
              <LogOut size={18} />
              Logout
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#0f172a]">Nama</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[#bbcabf] bg-[#f7f9fb] px-4 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                  placeholder="Nama pengguna"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#0f172a]">Email</span>
                <input
                  value={user?.email ?? ""}
                  readOnly
                  className="h-12 w-full cursor-not-allowed rounded-xl border border-[#e0e3e5] bg-[#f2f4f6] px-4 text-sm font-semibold text-[#64748b] outline-none"
                />
              </label>
              <Button
                type="button"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending || name.trim().length < 2}
                className="rounded-full bg-[#006c49] hover:bg-[#005236]"
              >
                <Save size={18} />
                Simpan Profile
              </Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#d8e5e0] bg-[#f7f9fb] p-4">
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f7f0] text-[#006c49]">
                    <KeyRound size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#0f172a]">Lupa password saat ini?</p>
                    <p className="mt-1 text-sm leading-5 text-[#64748b]">Kirim OTP ke email akun, lalu buat password baru tanpa password lama.</p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => sendResetOTP.mutate()}
                  disabled={sendResetOTP.isPending || !user?.email}
                  className="rounded-full bg-[#006c49] hover:bg-[#005236]"
                >
                  <Mail size={18} />
                  {sendResetOTP.isPending ? "Mengirim OTP..." : otpSent ? "Kirim Ulang OTP" : "Kirim OTP"}
                </Button>

                {otpSent && (
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#0f172a]">Kode OTP</span>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="h-12 w-full rounded-xl border border-[#bbcabf] bg-white px-4 text-sm font-semibold tracking-[0.2em] text-[#0f172a] outline-none transition focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                        placeholder="123456"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#0f172a]">Password baru</span>
                      <input
                        type="password"
                        value={otpPassword}
                        onChange={(event) => setOtpPassword(event.target.value)}
                        className="h-12 w-full rounded-xl border border-[#bbcabf] bg-white px-4 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                        placeholder="Minimal 8 karakter"
                      />
                    </label>
                    <Button
                      type="button"
                      onClick={() => resetPasswordWithOTP.mutate()}
                      disabled={resetPasswordWithOTP.isPending || otp.length !== 6 || otpPassword.length < 8}
                      className="rounded-full bg-[#006c49] hover:bg-[#005236]"
                    >
                      <Save size={18} />
                      {resetPasswordWithOTP.isPending ? "Memperbarui..." : "Reset via OTP"}
                    </Button>
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#0f172a]">Password saat ini</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[#bbcabf] bg-[#f7f9fb] px-4 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                  placeholder="Password lama"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#0f172a]">Password baru</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-[#bbcabf] bg-[#f7f9fb] px-4 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#006c49] focus:ring-1 focus:ring-[#006c49]"
                  placeholder="Minimal 8 karakter"
                />
              </label>
              <Button
                type="button"
                onClick={() => savePassword.mutate()}
                disabled={savePassword.isPending || currentPassword.length < 8 || newPassword.length < 8}
                className="rounded-full bg-[#006c49] hover:bg-[#005236]"
              >
                <Save size={18} />
                Ubah Password
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[#006c49]">
                <BellRing size={21} />
                <h2 className="text-lg font-bold text-[#0f172a]">Peringatan Pengeluaran</h2>
              </div>
              <p className="text-sm leading-6 text-[#64748b]">
                Atur batas pengeluaran. Jika total pengeluaran melewati batas, notifikasi akan muncul di icon lonceng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((current) => !current)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-[#006c49]" : "bg-[#d1d5db]"}`}
              aria-pressed={enabled}
              aria-label="Aktifkan peringatan pengeluaran"
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? "left-6" : "left-1"}`} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#0f172a]">Batas nominal</label>
              <div className="flex items-center rounded-xl border border-[#bbcabf] bg-[#f7f9fb] px-4 focus-within:border-[#006c49] focus-within:ring-1 focus-within:ring-[#006c49]">
                <span className="mr-2 text-sm font-bold text-[#006c49]">Rp</span>
                <NumericInput
                  value={limit}
                  onValueChange={setLimit}
                  placeholder="Contoh: 1500000"
                  className="h-12 w-full border-none bg-transparent p-0 text-base font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:ring-0"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-[#0f172a]">Periode monitoring</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {periods.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPeriod(item.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      period === item.value
                        ? "border-[#006c49] bg-[#e8f7f0] text-[#006c49]"
                        : "border-[#e0e3e5] bg-white text-[#0f172a] hover:border-[#b7e4d1]"
                    }`}
                  >
                    <span className="block text-sm font-bold">{item.label}</span>
                    <span className="mt-1 block text-xs leading-4 text-[#64748b]">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button type="button" onClick={saveSettings} className="w-full rounded-full bg-[#006c49] hover:bg-[#005236] sm:w-auto">
              <Save size={18} />
              Simpan Peringatan
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-[#0f172a]">Status Saat Ini</h2>
          <div className="mt-4 rounded-2xl bg-[#f7f9fb] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748b]">Peringatan</p>
            <p className={`mt-2 text-2xl font-black ${enabled ? "text-[#006c49]" : "text-[#64748b]"}`}>{enabled ? "Aktif" : "Nonaktif"}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#f7f9fb] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">Periode</p>
              <p className="mt-2 text-sm font-bold text-[#0f172a]">{period}</p>
            </div>
            <div className="rounded-2xl bg-[#f7f9fb] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">Limit</p>
              <p className="mt-2 text-sm font-bold text-[#0f172a]">{limit ? `Rp ${limit}` : "-"}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
