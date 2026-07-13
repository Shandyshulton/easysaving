"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, User, WalletCards } from "lucide-react";
import { endpoints } from "@/services/api/easysaving";
import { setStoredUser, setToken } from "@/services/api/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ActionFeedback, setActionFeedbackFlash, useActionFeedback } from "@/components/ui/action-feedback";
import { forgotPasswordSchema, loginOTPSchema, loginSchema, resetPasswordSchema } from "@/schemas/forms";
import { cn } from "@/lib/utils";

const authSchema = loginSchema.extend({
  name: z.string().optional()
});

type AuthMode = "login" | "register" | "forgot";
type LoginStep = "credentials" | "otp";
type ResetStep = "email" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [loginOtpRemaining, setLoginOtpRemaining] = useState(0);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const feedback = useActionFeedback();

  type AuthForm = z.infer<typeof authSchema>;
  type LoginOTPForm = z.infer<typeof loginOTPSchema>;
  type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
  type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

  const form = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: { name: "", email: "", password: "" }
  });
  const forgotForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });
  const loginOTPForm = useForm<LoginOTPForm>({
    resolver: zodResolver(loginOTPSchema),
    defaultValues: { email: "", otp: "" }
  });
  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "", otp: "", new_password: "" }
  });

  useEffect(() => {
    if (mode !== "login" || loginStep !== "otp" || loginOtpRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setLoginOtpRemaining((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loginOtpRemaining, loginStep, mode]);

  const loginMutation = useMutation({
    mutationFn: (values: AuthForm) => endpoints.login(values),
    onSuccess: (data, values) => {
      loginOTPForm.reset({ email: data.email || values.email, otp: "" });
      setLoginOtpRemaining(data.expires_in || 60);
      setLoginStep("otp");
      feedback.showSuccess("OTP dikirim", "Masukkan kode OTP untuk menyelesaikan login.");
    },
    onError: (error) => {
      feedback.showError("Login gagal", (error as Error).message);
    }
  });

  const verifyLoginMutation = useMutation({
    mutationFn: (values: LoginOTPForm) => endpoints.verifyLoginOTP(values),
    onSuccess: (data) => {
      setToken(data.token);
      setStoredUser(data.user);
      setActionFeedbackFlash({ type: "success", title: "Login berhasil", message: "Selamat datang di EasySaving." });
      router.push("/dashboard");
    },
    onError: (error) => {
      feedback.showError("OTP tidak valid", (error as Error).message);
    }
  });

  const registerMutation = useMutation({
    mutationFn: (values: AuthForm) => endpoints.register({ ...values, name: values.name ?? "" }),
    onSuccess: (_, values) => {
      feedback.showSuccess("Akun berhasil dibuat", "Silakan login untuk masuk ke EasySaving.");
      form.reset({ name: "", email: values.email, password: "" });
      switchMode("login");
    },
    onError: (error) => {
      feedback.showError("Register gagal", (error as Error).message);
    }
  });

  const forgotMutation = useMutation({
    mutationFn: (values: ForgotPasswordForm) => endpoints.forgotPassword(values),
    onSuccess: (_, values) => {
      resetForm.setValue("email", values.email);
      setResetStep("otp");
      feedback.showSuccess("OTP dikirim", "Cek email terdaftar untuk kode reset password.");
    },
    onError: (error) => {
      feedback.showError("Gagal mengirim OTP", (error as Error).message);
    }
  });

  const resetMutation = useMutation({
    mutationFn: (values: ResetPasswordForm) => endpoints.resetPassword(values),
    onSuccess: () => {
      feedback.showSuccess("Password diperbarui", "Silakan login memakai password baru.");
      form.setValue("email", resetForm.getValues("email"));
      form.setValue("password", "");
      switchMode("login");
      resetForm.reset({ email: "", otp: "", new_password: "" });
    },
    onError: (error) => {
      feedback.showError("Reset password gagal", (error as Error).message);
    }
  });

  function switchMode(next: AuthMode) {
    setMode(next);
    if (next === "forgot") {
      const email = form.getValues("email");
      forgotForm.setValue("email", email);
      resetForm.setValue("email", email);
      setResetStep("email");
    }
    form.clearErrors();
    forgotForm.clearErrors();
    loginOTPForm.clearErrors();
    resetForm.clearErrors();
    loginMutation.reset();
    verifyLoginMutation.reset();
    registerMutation.reset();
    forgotMutation.reset();
    resetMutation.reset();
    if (next !== "login") {
      setLoginStep("credentials");
      setLoginOtpRemaining(0);
      loginOTPForm.reset({ email: "", otp: "" });
    }
  }

  const isLoading = loginMutation.isPending || verifyLoginMutation.isPending || registerMutation.isPending || forgotMutation.isPending || resetMutation.isPending;
  const title = mode === "login" ? (loginStep === "otp" ? "Verifikasi OTP" : "Selamat Datang") : mode === "register" ? "Buat Akun Baru" : "Reset Password";
  const subtitle =
    mode === "login"
      ? loginStep === "otp"
        ? "Masukkan kode OTP yang dikirim ke email Anda."
        : "Masuk untuk lanjut mengelola keuangan."
      : mode === "register"
        ? "Mulai catat saldo dan transaksi dengan rapi."
        : resetStep === "email"
          ? "Masukkan email terdaftar untuk menerima OTP."
          : "Masukkan OTP dan password baru Anda.";

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden overflow-y-auto bg-[#f7f9fb] px-5 pb-10 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:justify-center sm:py-10">
      <ActionFeedback feedback={feedback.feedback} onClose={feedback.clear} />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-10 h-80 w-80 rounded-full bg-[#d8e5e0] opacity-70 blur-3xl" />
        <div className="absolute -right-24 bottom-12 h-80 w-80 rounded-full bg-[#93f7c1] opacity-25 blur-3xl" />
      </div>

      {isLoading && <AuthLoadingOverlay mode={mode} />}

      <div className="relative z-10 mb-6 flex h-12 w-full shrink-0 items-center justify-center sm:mb-8">
        <BrandLogo priority className="w-44" />
      </div>

      <section className="relative z-10 w-full max-w-[420px]">
        <div className="rounded-[2rem] border border-[#bdcac0] bg-white p-8 shadow-[0_4px_24px_rgba(15,23,42,0.06)] md:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#d8e5e0] text-[#006843]">
              {mode === "forgot" ? <KeyRound size={29} strokeWidth={1.8} /> : <WalletCards size={29} fill="currentColor" strokeWidth={1.7} />}
            </div>
            <h1 className="text-2xl font-black leading-8 text-[#191c1e]">{title}</h1>
            <p className="mt-1 text-sm leading-5 text-[#3e4942]">{subtitle}</p>
          </div>

          {mode !== "forgot" && loginStep === "credentials" ? (
            <AuthLoginRegister
              form={form}
              mode={mode}
              isLoading={isLoading}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              switchMode={switchMode}
              onSubmit={(values) => {
                if (mode === "register" && !values.name?.trim()) {
                  form.setError("name", { message: "Nama wajib diisi" });
                  return;
                }
                if (mode === "login") {
                  loginMutation.mutate(values);
                } else {
                  registerMutation.mutate(values);
                }
              }}
            />
          ) : mode === "login" ? (
            <LoginOTPFormView
              form={loginOTPForm}
              remaining={loginOtpRemaining}
              isLoading={isLoading}
              onSubmit={(values) => verifyLoginMutation.mutate(values)}
              onResend={() => loginMutation.mutate(form.getValues())}
              onBack={() => {
                setLoginStep("credentials");
                setLoginOtpRemaining(0);
                loginOTPForm.reset({ email: "", otp: "" });
              }}
            />
          ) : resetStep === "email" ? (
            <form className="space-y-4" onSubmit={forgotForm.handleSubmit((values) => forgotMutation.mutate(values))}>
              <AuthField label="Email" icon={<Mail size={20} />} error={forgotForm.formState.errors.email?.message}>
                <input
                  type="email"
                  className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold text-[#191c1e] outline-none transition placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
                  placeholder="contoh@email.com"
                  disabled={isLoading}
                  {...forgotForm.register("email")}
                />
              </AuthField>

              <div className="pt-3">
                <Button className="h-14 w-full rounded-xl bg-[#108357] text-sm font-black shadow-[0_14px_30px_rgba(0,104,67,0.20)] hover:bg-[#006843] active:scale-[0.98]" disabled={isLoading}>
                  {forgotMutation.isPending ? "Mengirim OTP..." : "Kirim OTP"}
                  {!forgotMutation.isPending && <ArrowRight size={18} />}
                </Button>
              </div>
              <BackToLogin disabled={isLoading} onClick={() => switchMode("login")} />
            </form>
          ) : (
            <form className="space-y-4" onSubmit={resetForm.handleSubmit((values) => resetMutation.mutate(values))}>
              <AuthField label="Email" icon={<Mail size={20} />} error={resetForm.formState.errors.email?.message}>
                <input
                  type="email"
                  className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold text-[#191c1e] outline-none transition placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
                  placeholder="contoh@email.com"
                  disabled={isLoading}
                  {...resetForm.register("email")}
                />
              </AuthField>

              <AuthField label="OTP" icon={<KeyRound size={20} />} error={resetForm.formState.errors.otp?.message}>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  onInput={(event) => {
                    const target = event.currentTarget;
                    target.value = target.value.replace(/\D/g, "").slice(0, 6);
                  }}
                  className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold tracking-[0.2em] text-[#191c1e] outline-none transition placeholder:tracking-normal placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
                  placeholder="123456"
                  disabled={isLoading}
                  {...resetForm.register("otp")}
                />
              </AuthField>

              <AuthField label="Password Baru" icon={<LockKeyhole size={20} />} error={resetForm.formState.errors.new_password?.message}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold text-[#191c1e] outline-none transition placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
                  placeholder="Minimal 8 karakter"
                  disabled={isLoading}
                  {...resetForm.register("new_password")}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e7a71] transition hover:text-[#006843]"
                  aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </AuthField>

              <div className="pt-3">
                <Button className="h-14 w-full rounded-xl bg-[#108357] text-sm font-black shadow-[0_14px_30px_rgba(0,104,67,0.20)] hover:bg-[#006843] active:scale-[0.98]" disabled={isLoading}>
                  {resetMutation.isPending ? "Memperbarui password..." : "Reset Password"}
                  {!resetMutation.isPending && <ArrowRight size={18} />}
                </Button>
              </div>
              <button type="button" disabled={isLoading} onClick={() => setResetStep("email")} className="w-full text-center text-xs font-semibold text-[#006843] transition hover:text-[#108357] disabled:opacity-60">
                Kirim ulang OTP
              </button>
              <BackToLogin disabled={isLoading} onClick={() => switchMode("login")} />
            </form>
          )}
        </div>

        <p className="mt-8 px-4 text-center text-sm leading-6 text-[#6e7a71]">
          Dengan melanjutkan, Anda menyetujui pengelolaan data akun dan transaksi untuk kebutuhan pencatatan EasySaving.
        </p>
      </section>
    </main>
  );
}

function AuthLoginRegister({
  form,
  mode,
  isLoading,
  showPassword,
  setShowPassword,
  switchMode,
  onSubmit
}: {
  form: ReturnType<typeof useForm<z.infer<typeof authSchema>>>;
  mode: AuthMode;
  isLoading: boolean;
  showPassword: boolean;
  setShowPassword: (value: boolean | ((current: boolean) => boolean)) => void;
  switchMode: (mode: AuthMode) => void;
  onSubmit: (values: z.infer<typeof authSchema>) => void;
}) {
  return (
    <>
      <div className="relative mb-8 flex rounded-xl bg-[#f2f4f6] p-1.5">
        <div
          className={cn(
            "absolute bottom-1.5 top-1.5 rounded-lg border border-[#e0e3e5] bg-white shadow-sm transition-all duration-300",
            mode === "login" ? "left-1.5 right-[calc(50%+6px)]" : "left-[calc(50%+6px)] right-1.5"
          )}
        />
        {(["login", "register"] as const).map((item) => (
          <button
            key={item}
            type="button"
            disabled={isLoading}
            className={cn("relative z-10 flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors", mode === item ? "text-[#006843]" : "text-[#3e4942]")}
            onClick={() => switchMode(item)}
          >
            {item === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {mode === "register" && (
          <AuthField label="Nama Lengkap" icon={<User size={20} />} error={form.formState.errors.name?.message}>
            <input
              className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold text-[#191c1e] outline-none transition placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
              placeholder="Masukkan nama Anda"
              disabled={isLoading}
              {...form.register("name")}
            />
          </AuthField>
        )}

        <AuthField label="Email" icon={<Mail size={20} />} error={form.formState.errors.email?.message}>
          <input
            type="email"
            className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold text-[#191c1e] outline-none transition placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
            placeholder="contoh@email.com"
            disabled={isLoading}
            {...form.register("email")}
          />
        </AuthField>

        <AuthField label="Password" icon={<LockKeyhole size={20} />} error={form.formState.errors.password?.message}>
          <input
            type={showPassword ? "text" : "password"}
            className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold text-[#191c1e] outline-none transition placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
            placeholder="Minimal 8 karakter"
            disabled={isLoading}
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e7a71] transition hover:text-[#006843]"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </AuthField>

        {(form.formState.errors.email || form.formState.errors.password || form.formState.errors.name) && (
          <p className="rounded-xl bg-[#ffdad8] px-4 py-3 text-sm font-semibold text-[#93000a]">
            {form.formState.errors.email?.message ?? form.formState.errors.password?.message ?? form.formState.errors.name?.message}
          </p>
        )}

        <div className="pt-3">
          <Button className="h-14 w-full rounded-xl bg-[#108357] text-sm font-black shadow-[0_14px_30px_rgba(0,104,67,0.20)] hover:bg-[#006843] active:scale-[0.98]" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="auth-button-spinner" />
                {mode === "login" ? "Memproses login..." : "Membuat akun..."}
              </>
            ) : (
              <>
                {mode === "login" ? "Masuk" : "Buat Akun"}
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        </div>

        {mode === "login" && (
          <button type="button" disabled={isLoading} onClick={() => switchMode("forgot")} className="w-full text-center text-xs font-semibold text-[#006843] transition hover:text-[#108357] disabled:opacity-60">
            Lupa password?
          </button>
        )}
      </form>
    </>
  );
}

function LoginOTPFormView({
  form,
  remaining,
  isLoading,
  onSubmit,
  onResend,
  onBack
}: {
  form: ReturnType<typeof useForm<z.infer<typeof loginOTPSchema>>>;
  remaining: number;
  isLoading: boolean;
  onSubmit: (values: z.infer<typeof loginOTPSchema>) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const canResend = remaining === 0 && !isLoading;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <AuthField label="Email" icon={<Mail size={20} />} error={form.formState.errors.email?.message}>
        <input
          type="email"
          className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold text-[#191c1e] outline-none transition placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
          placeholder="contoh@email.com"
          readOnly
          {...form.register("email")}
        />
      </AuthField>

      <AuthField label="Kode OTP" icon={<KeyRound size={20} />} error={form.formState.errors.otp?.message}>
        <input
          inputMode="numeric"
          maxLength={6}
          onInput={(event) => {
            const target = event.currentTarget;
            target.value = target.value.replace(/\D/g, "").slice(0, 6);
          }}
          className="h-12 w-full rounded-xl border-2 border-[#bdcac0] bg-white px-12 text-sm font-semibold tracking-[0.2em] text-[#191c1e] outline-none transition placeholder:tracking-normal placeholder:text-[#9aa5a0] focus:border-[#006843] focus:ring-4 focus:ring-[#006843]/5"
          placeholder="123456"
          disabled={isLoading}
          {...form.register("otp")}
        />
      </AuthField>

      <div className="rounded-xl border border-[#bdcac0] bg-[#f7f9fb] px-4 py-3 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6e7a71]">Kode berlaku</p>
        <p className={cn("mt-1 text-2xl font-black", remaining > 0 ? "text-[#006843]" : "text-[#ba1a1a]")}>{formatCountdown(remaining)}</p>
      </div>

      <div className="pt-3">
        <Button className="h-14 w-full rounded-xl bg-[#108357] text-sm font-black shadow-[0_14px_30px_rgba(0,104,67,0.20)] hover:bg-[#006843] active:scale-[0.98]" disabled={isLoading || remaining === 0}>
          {isLoading ? "Memverifikasi..." : "Verifikasi OTP"}
          {!isLoading && <ArrowRight size={18} />}
        </Button>
      </div>

      <button
        type="button"
        disabled={!canResend}
        onClick={onResend}
        className="w-full text-center text-xs font-semibold text-[#006843] transition hover:text-[#108357] disabled:text-[#6e7a71] disabled:opacity-60"
      >
        {remaining > 0 ? `Kirim ulang OTP dalam ${formatCountdown(remaining)}` : "Kirim ulang OTP"}
      </button>

      <button type="button" disabled={isLoading} onClick={onBack} className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-[#006843] transition hover:text-[#108357] disabled:opacity-60">
        <ArrowLeft size={15} />
        Ubah email atau password
      </button>
    </form>
  );
}

function BackToLogin({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-[#006843] transition hover:text-[#108357] disabled:opacity-60">
      <ArrowLeft size={15} />
      Kembali ke login
    </button>
  );
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function AuthField({ label, icon, error, children }: { label: string; icon: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 ml-1 block text-xs font-bold leading-4 tracking-[0.02em] text-[#3e4942]">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6e7a71]">{icon}</span>
        {children}
      </span>
      {error ? <span className="mt-1.5 block text-xs font-semibold text-[#ba1a1a]">{error}</span> : null}
    </label>
  );
}

function AuthLoadingOverlay({ mode }: { mode: AuthMode }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#f7f9fb]/92 px-6 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0">
        <div className="auth-loading-glow absolute inset-0" />
      </div>
      <div className="relative flex flex-col items-center text-center">
        <div className="mb-10 flex flex-col items-center gap-2 auth-loading-fade">
          <BrandLogo className="w-44" />
          <span className="h-px w-10 bg-[#108357]/30" />
        </div>

        <div className="relative grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 rounded-full border border-[#006843]/10" />
          <span className="auth-loading-ring absolute inset-0 rounded-full border-2 border-transparent border-t-[#006843]" />
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#108357]/10 text-[#006843]">
            <ShieldCheck size={30} fill="currentColor" strokeWidth={1.5} />
          </span>
        </div>

        <h2 className="mt-8 text-xl font-black text-[#191c1e]">Otentikasi Aman</h2>
        <div className="mt-3 flex items-center justify-center gap-1 opacity-70">
          <span className="auth-loading-dot" />
          <span className="auth-loading-dot [animation-delay:160ms]" />
          <span className="auth-loading-dot [animation-delay:320ms]" />
        </div>
        <p className="auth-loading-pulse mt-8 text-sm font-semibold text-[#3e4942]">
          {mode === "login" ? "Menyiapkan akun Anda..." : mode === "register" ? "Membuat ruang finansial Anda..." : "Memproses reset password..."}
        </p>
        <div className="mt-6 h-1 w-64 overflow-hidden rounded-full bg-[#e0e3e5]">
          <span className="auth-loading-progress block h-full rounded-full bg-[#108357]" />
        </div>
      </div>
    </div>
  );
}
