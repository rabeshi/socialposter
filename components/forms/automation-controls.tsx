"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AutomationSettingsValues {
  automationEnabled: boolean;
  generationIntervalDays: number;
  generationTimezone: string;
  preferredLocalGenerationTime: string;
  nextGenerationAt: string | null;
  lastSuccessfulGenerationAt: string | null;
  skipNextGeneration: boolean;
  reminderIntervalHours: number;
  maxReminders: number;
  defaultPlatforms: string[];
  publishingPaused: boolean;
  manualPublishingFallback: boolean;
}

const TIMEZONES = ["America/Los_Angeles", "America/New_York", "America/Chicago", "America/Denver", "UTC"];

export function AutomationControls({ settings }: { settings: AutomationSettingsValues }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState(settings.nextGenerationAt?.slice(0, 16) ?? "");
  const [time, setTime] = useState(settings.preferredLocalGenerationTime);
  const [timezone, setTimezone] = useState(settings.generationTimezone);

  async function patch(action: string, extra?: Record<string, unknown>) {
    setBusy(action);
    try {
      const res = await fetch("/api/settings/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function generateNow() {
    setBusy("generate_now");
    try {
      await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: ["SAAS_DISCOVERY", "SAAS_COST_OPTIMIZATION", "SECURITY_RISK_COMPLIANCE"] }),
      });
      router.push("/review");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Automation</span>
            <Badge variant={settings.automationEnabled ? "success" : "outline"}>{settings.automationEnabled ? "Enabled" : "Disabled"}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Next generation</span>
            <span>{settings.nextGenerationAt ? new Date(settings.nextGenerationAt).toLocaleString() : "Not scheduled"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Last successful generation</span>
            <span>{settings.lastSuccessfulGenerationAt ? new Date(settings.lastSuccessfulGenerationAt).toLocaleString() : "Never"}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" disabled={busy !== null} onClick={() => patch(settings.automationEnabled ? "disable" : "enable")}>
              {settings.automationEnabled ? "Pause Automation" : "Resume Automation"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={generateNow}>
              Generate Now
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => patch(settings.skipNextGeneration ? "resume_after_skip" : "skip_next")}>
              {settings.skipNextGeneration ? "Cancel Skip" : "Skip Next Generation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Change next generation date</Label>
            <div className="flex gap-2">
              <Input type="datetime-local" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
              <Button size="sm" disabled={!nextDate || busy !== null} onClick={() => patch("set_next_date", { nextGenerationAt: new Date(nextDate).toISOString() })}>
                Set
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Generation time (local)</Label>
            <div className="flex gap-2">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <Button size="sm" disabled={busy !== null} onClick={() => patch("set_time", { preferredLocalGenerationTime: time })}>
                Set
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Time zone</Label>
            <div className="flex gap-2">
              <select className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
              <Button size="sm" disabled={busy !== null} onClick={() => patch("set_timezone", { generationTimezone: timezone })}>
                Set
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Publishing paused (emergency)</span>
            <Button size="sm" variant={settings.publishingPaused ? "destructive" : "outline"} disabled={busy !== null} onClick={() => patch("update", { publishingPaused: !settings.publishingPaused })}>
              {settings.publishingPaused ? "Resume Publishing" : "Pause All Publishing"}
            </Button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Manual publishing fallback</span>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => patch("update", { manualPublishingFallback: !settings.manualPublishingFallback })}>
              {settings.manualPublishingFallback ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Reminder interval: {settings.reminderIntervalHours} hours</p>
          <p>Maximum reminders per batch: {settings.maxReminders}</p>
        </CardContent>
      </Card>
    </div>
  );
}
