"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, DEMO_CREDENTIALS } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";

const schema = z.object({
  email: z.string().email("Enter a valid corporate email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const login = useAuthStore((s) => s.login);
  const demoLogin = useAuthStore((s) => s.demoLogin);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await login(values.email, values.password);
    if (!result.ok) {
      form.setError("password", { message: result.error });
      toast.error(result.error);
      return;
    }
    toast.success("Signed in to PetroTrade OS");
    router.push("/dashboard");
  });

  const onDemoLogin = async () => {
    form.clearErrors();
    form.setValue("email", DEMO_CREDENTIALS.email);
    form.setValue("password", DEMO_CREDENTIALS.password);
    const result = await demoLogin("SUPER_ADMIN");
    if (!result.ok) {
      form.setError("password", { message: result.error });
      toast.error(result.error ?? "Demo admin login failed. Backend may still be seeding.");
      return;
    }
    toast.success("Demo Super Admin session started");
    router.push("/dashboard");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy p-10 text-white lg:flex lg:flex-col">
        <div>
          <p className="text-sm font-semibold">{APP_NAME}</p>
          <h1 className="mt-8 max-w-md text-4xl font-semibold leading-tight">
            Industrial Procurement
            <br />
            Operating System
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Manage Buyers, Sellers, Orders, Credit, Logistics and Finance from one unified platform.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Admin Portal</p>
          <h2 className="mt-2 text-2xl font-semibold">Welcome Back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to PetroTrade Super Admin Portal</p>
          <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Corporate Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@test.local"
                {...form.register("email")}
                aria-invalid={Boolean(form.formState.errors.email)}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
                aria-invalid={Boolean(form.formState.errors.password)}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.watch("remember")}
                  onCheckedChange={(checked) => form.setValue("remember", Boolean(checked))}
                />
                Remember Me
              </label>
              <button type="button" className="text-sm text-primary" onClick={() => toast.message("Contact IT Administrator to reset access.")}>
                Forgot Password?
              </button>
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => {
                void onDemoLogin();
              }}
            >
              Continue with demo login
            </Button>
          </form>
          <p className="mt-8 text-xs text-muted-foreground">
            Sample credentials: {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Need Technical Support?
            <br />
            Contact IT Administrator
          </p>
        </div>
      </section>
    </div>
  );
}
