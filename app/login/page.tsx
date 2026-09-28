"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .regex(/^[^\s@]+@[^\s@]+$/, "Enter a valid corporate email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const HIGHLIGHTS = [
  {
    icon: Users,
    title: "Buyers & Sellers",
    description: "Onboarding, verification and compliance in one queue.",
  },
  {
    icon: Truck,
    title: "Orders & Logistics",
    description: "Track procurement, dispatch and delivery end to end.",
  },
  {
    icon: BarChart3,
    title: "Credit & Finance",
    description: "Approve credit lines, settlements and payouts with audit trails.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await login(values.email, values.password);
    if (!result.ok) {
      const message = result.error ?? "Invalid corporate email or password.";
      setFormError(message);
      form.setFocus("password");
      return;
    }
    toast.success(`Signed in to ${APP_NAME}`);
    router.push("/dashboard");
  });

  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState("CapsLock"));
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-[24rem] rounded-full bg-navy-accent/30 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
        </div>

        <div className="relative max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Industrial Procurement
            <br />
            <span className="text-white/60">Operating System</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/70">
            Manage buyers, sellers, orders, credit, logistics and finance from one unified control
            center.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="size-5 text-white/90" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-white/60">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-white/50">
          <Lock className="size-3.5" />
          Secure access for authorized administrators only
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-navy text-white">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12)] sm:p-9">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <ShieldCheck className="size-3.5" />
              Admin Portal
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to the {APP_NAME} Super Admin console.
            </p>

            {formError ? (
              <div
                role="alert"
                className="mt-6 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            <form className="mt-6 flex flex-col gap-5" onSubmit={onSubmit} noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Corporate email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    placeholder="name@company"
                    className={cn(
                      "h-11 pl-10",
                      errors.email && "border-destructive focus-visible:ring-destructive",
                    )}
                    {...form.register("email", { onChange: () => setFormError(null) })}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                </div>
                {errors.email ? (
                  <p id="email-error" className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      toast.message("Password resets are handled by your platform Super Admin.")
                    }
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={cn(
                      "h-11 pl-10 pr-11",
                      errors.password && "border-destructive focus-visible:ring-destructive",
                    )}
                    onKeyDown={trackCapsLock}
                    onKeyUp={trackCapsLock}
                    {...form.register("password", { onChange: () => setFormError(null) })}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p id="password-error" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                ) : capsLockOn ? (
                  <p className="text-xs text-amber-600">Caps Lock is on</p>
                ) : null}
              </div>

              <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
                <Checkbox
                  checked={form.watch("remember")}
                  onCheckedChange={(checked) => form.setValue("remember", Boolean(checked))}
                />
                Keep me signed in
              </label>

              <Button type="submit" className="h-11 text-sm font-semibold" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            Protected by encrypted sessions
          </p>
        </div>
      </section>
    </div>
  );
}
