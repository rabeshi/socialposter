"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { CandidateData } from "@/components/review/candidate-card";

type Platform = "LINKEDIN" | "X";

export function CandidateEditor({
  candidate,
  onSaveEdits,
  onRegenerateImage,
  onApprove,
  onReturnToEditing,
  onPublishNow,
  onSchedule,
  onSaveManual,
}: {
  candidate: CandidateData;
  onSaveEdits: (fields: { linkedinCopy: string; xCopy: string; headline: string }) => Promise<void>;
  onRegenerateImage: () => Promise<void>;
  onApprove: () => Promise<void>;
  onReturnToEditing: () => void;
  onPublishNow: (platforms: Platform[]) => Promise<void>;
  onSchedule: (platforms: Platform[], scheduledTime: string) => Promise<void>;
  onSaveManual: (platforms: Platform[]) => Promise<void>;
}) {
  const [linkedinCopy, setLinkedinCopy] = useState(candidate.linkedinCopy);
  const [xCopy, setXCopy] = useState(candidate.xCopy);
  const [headline, setHeadline] = useState(candidate.headline ?? "");
  const [confirmed, setConfirmed] = useState(candidate.status === "APPROVED" || candidate.status === "SCHEDULED");
  const [platforms, setPlatforms] = useState<Platform[]>(["LINKEDIN", "X"]);
  const [scheduledTime, setScheduledTime] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);

  const isApproved = candidate.status === "APPROVED" || candidate.status === "SCHEDULED";

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSave() {
    setBusy("save");
    try {
      await onSaveEdits({ linkedinCopy, xCopy, headline });
      setSaved(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editing: {candidate.hook}</CardTitle>
        <p className="text-sm text-muted-foreground">{candidate.category.replaceAll("_", " ")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {candidate.thumbnailUrl && (
          <div className="relative aspect-[1200/627] w-full max-w-md overflow-hidden rounded-md border">
            <Image src={candidate.thumbnailUrl} alt={candidate.altText ?? ""} fill className="object-cover" unoptimized />
          </div>
        )}
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => onRegenerateImage()}>
          Regenerate Image
        </Button>

        <div className="space-y-2">
          <Label htmlFor="headline">Visual headline (optional)</Label>
          <Input id="headline" value={headline} onChange={(e) => { setHeadline(e.target.value); setSaved(false); }} maxLength={80} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn copy ({linkedinCopy.trim().split(/\s+/).filter(Boolean).length} words)</Label>
          <Textarea
            id="linkedin"
            rows={10}
            value={linkedinCopy}
            onChange={(e) => { setLinkedinCopy(e.target.value); setSaved(false); }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="x">X copy ({xCopy.length}/280 characters)</Label>
          <Textarea id="x" rows={4} value={xCopy} maxLength={280} onChange={(e) => { setXCopy(e.target.value); setSaved(false); }} />
        </div>

        {!saved && (
          <Button size="sm" disabled={busy !== null} onClick={handleSave}>
            {busy === "save" ? "Saving..." : "Save Edits"}
          </Button>
        )}

        <div className="flex items-center gap-2 border-t pt-4">
          <Checkbox id="confirm" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} disabled={isApproved} />
          <Label htmlFor="confirm" className="text-sm font-normal">
            I have checked this content and it is ready for approval.
          </Label>
        </div>

        {!isApproved && (
          <Button
            disabled={!confirmed || !saved || busy !== null}
            onClick={async () => {
              setBusy("approve");
              try {
                await onApprove();
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "approve" ? "Approving..." : "Approve"}
          </Button>
        )}

        {isApproved && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label className="mb-2 block">Platforms</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox checked={platforms.includes("LINKEDIN")} onCheckedChange={() => togglePlatform("LINKEDIN")} />
                  LinkedIn
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={platforms.includes("X")} onCheckedChange={() => togglePlatform("X")} />
                  X
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Button
                disabled={platforms.length === 0 || busy !== null}
                onClick={async () => {
                  setBusy("publish");
                  try {
                    await onPublishNow(platforms);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === "publish" ? "Publishing..." : "Publish Now"}
              </Button>

              <div className="flex items-end gap-2">
                <div>
                  <Label htmlFor="scheduledTime" className="text-xs">Schedule for</Label>
                  <Input
                    id="scheduledTime"
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={!scheduledTime || platforms.length === 0 || busy !== null}
                  onClick={async () => {
                    setBusy("schedule");
                    try {
                      await onSchedule(platforms, new Date(scheduledTime).toISOString());
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {busy === "schedule" ? "Scheduling..." : "Schedule"}
                </Button>
              </div>

              <Button
                variant="secondary"
                disabled={platforms.length === 0 || busy !== null}
                onClick={async () => {
                  setBusy("manual");
                  try {
                    await onSaveManual(platforms);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === "manual" ? "Saving..." : "Save as Ready for Manual Publishing"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="ghost" onClick={onReturnToEditing}>Return to Editing</Button>
      </CardFooter>
    </Card>
  );
}
