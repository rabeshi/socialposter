"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/posts/status-badge";

export interface CandidateData {
  id: string;
  category: string;
  contentAngle: string;
  hook: string;
  headline: string | null;
  linkedinCopy: string;
  xCopy: string;
  hashtags: string[];
  altText: string | null;
  thumbnailUrl: string | null;
  status: string;
  qualityScore: number | null;
  similarityScore: number | null;
  factualityNotes: string | null;
  riskNotes: string | null;
  suggestedPublicationDate: string | null;
  suggestedPublicationTime: string | null;
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function CandidateCard({
  candidate,
  onSelect,
  onReject,
  onRegenerateCopy,
  onRegenerateImage,
  disabled,
}: {
  candidate: CandidateData;
  onSelect: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onRegenerateCopy: (id: string) => Promise<void>;
  onRegenerateImage: (id: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<void>) {
    setBusy(action);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  const similarityWarning = (candidate.similarityScore ?? 0) >= 0.82;

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{candidate.category.replaceAll("_", " ")}</Badge>
          <StatusBadge status={candidate.status} />
        </div>
        <CardTitle className="text-base">{candidate.hook}</CardTitle>
        <p className="text-xs text-muted-foreground">{candidate.contentAngle}</p>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {candidate.thumbnailUrl && (
          <div className="relative aspect-[1200/627] w-full overflow-hidden rounded-md border">
            <Image src={candidate.thumbnailUrl} alt={candidate.altText ?? ""} fill className="object-cover" unoptimized />
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground">LinkedIn ({wordCount(candidate.linkedinCopy)} words)</p>
          <p className="whitespace-pre-line text-sm">{candidate.linkedinCopy}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground">X ({candidate.xCopy.length}/280 chars)</p>
          <p className="text-sm">{candidate.xCopy}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          {candidate.hashtags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">{tag}</span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>Quality: {candidate.qualityScore != null ? Math.round(candidate.qualityScore * 100) : "—"}%</span>
          <span>
            Suggested: {candidate.suggestedPublicationDate?.slice(0, 10) ?? "TBD"} {candidate.suggestedPublicationTime ?? ""}
          </span>
        </div>

        {similarityWarning && (
          <p className="rounded-md bg-amber-100 p-2 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            Similarity to a recent post is high ({Math.round((candidate.similarityScore ?? 0) * 100)}%). Review before selecting.
          </p>
        )}

        {candidate.factualityNotes && <p className="text-xs text-muted-foreground">Factuality: {candidate.factualityNotes}</p>}
        {candidate.riskNotes && <p className="text-xs text-muted-foreground">Risk: {candidate.riskNotes}</p>}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={disabled || busy !== null}
          onClick={() => run("select", () => onSelect(candidate.id))}
        >
          {busy === "select" ? "Selecting..." : "Select Candidate"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || busy !== null}
          onClick={() => run("copy", () => onRegenerateCopy(candidate.id))}
        >
          {busy === "copy" ? "Regenerating..." : "Regenerate Copy"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || busy !== null}
          onClick={() => run("image", () => onRegenerateImage(candidate.id))}
        >
          {busy === "image" ? "Regenerating..." : "Regenerate Image"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={disabled || busy !== null}
          onClick={() => run("reject", () => onReject(candidate.id))}
        >
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
}
