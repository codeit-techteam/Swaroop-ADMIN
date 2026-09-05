"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABELS } from "@/lib/permissions";
import type { AdminRole } from "@/types";

const generalSchema = z.object({
  org: z.string().min(2),
  supportEmail: z.string().email(),
  timezone: z.string().min(2),
});

export default function SettingsPage() {
  const form = useForm({
    resolver: zodResolver(generalSchema),
    defaultValues: { org: "PetroTrade OS", supportEmail: "it@petrotrade.com", timezone: "Asia/Kolkata" },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Frontend-only platform preferences for the Admin Portal." />
      <Tabs defaultValue="general" className="rounded-md border bg-white p-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="prefs">System Preferences</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="pt-4">
          <form
            className="flex max-w-lg flex-col gap-4"
            onSubmit={form.handleSubmit(() => toast.success("General settings saved"))}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org">Organization</Label>
              <Input id="org" {...form.register("org")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supportEmail">Support email</Label>
              <Input id="supportEmail" {...form.register("supportEmail")} />
              {form.formState.errors.supportEmail ? <p className="text-xs text-destructive">{form.formState.errors.supportEmail.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...form.register("timezone")} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </TabsContent>
        <TabsContent value="notifications" className="flex max-w-lg flex-col gap-3 pt-4">
          {["KYC alerts", "Payment failures", "Dispute SLA", "Delayed shipments"].map((item) => (
            <label key={item} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              {item}
              <Switch defaultChecked />
            </label>
          ))}
          <Button type="button" onClick={() => toast.success("Notification preferences saved")}>Save</Button>
        </TabsContent>
        <TabsContent value="security" className="flex max-w-lg flex-col gap-3 pt-4">
          <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            Require confirmation for destructive actions
            <Switch defaultChecked />
          </label>
          <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            Session timeout 8 hours
            <Switch defaultChecked />
          </label>
          <Button type="button" onClick={() => toast.success("Security preferences saved")}>Save</Button>
        </TabsContent>
        <TabsContent value="roles" className="pt-4">
          <div className="grid gap-2">
            {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
              <div key={role} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{ROLE_LABELS[role]}</p>
                <p className="text-muted-foreground">{role}</p>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="prefs" className="flex max-w-lg flex-col gap-3 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label>Default landing</Label>
            <Input defaultValue="/dashboard" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea defaultValue="Dense enterprise density. Navy control-tower chrome." />
          </div>
          <Button type="button" onClick={() => toast.success("Preferences saved")}>Save</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
