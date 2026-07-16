"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CandidateCard, type CandidateData } from "@/components/review/candidate-card";
import { CandidateEditor } from "@/components/review/candidate-editor";
import { Button } from "@/components/ui/button";

type Platform = "LINKEDIN" | "X";

export interface BatchData {
  id: string;
  status: string;
  candidates: CandidateData[];
}

async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.formErrors?.join(", ") ?? body?.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export function ReviewBatchClient({ batch }: { batch: BatchData }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const selected = batch.candidates.find((c) => c.status === "CANDIDATE_SELECTED" || c.status === "APPROVED" || c.status === "SCHEDULED");
  const pending = batch.candidates.filter((c) => c.status === "PENDING_REVIEW");

  function refresh() {
    router.refresh();
  }

  async function guarded(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function handleSelect(id: string) {
    await guarded(() => api(`/api/candidates/${id}/select`, { method: "POST" }));
  }
  async function handleReject(id: string) {
    await guarded(() => api(`/api/candidates/${id}/reject`, { method: "POST" }));
  }
  async function handleRegenerateCopy(id: string) {
    await guarded(() => api(`/api/candidates/${id}/regenerate-copy`, { method: "POST" }));
  }
  async function handleRegenerateImage(id: string) {
    await guarded(() => api(`/api/candidates/${id}/regenerate-image`, { method: "POST" }));
  }

  async function handleRequestNew() {
    await guarded(() => api(`/api/batches/${batch.id}/regenerate`, { method: "POST" }));
  }

  if (!selected) {
    return (
      <div className="space-y-4">
        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {pending.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onSelect={handleSelect}
              onReject={handleReject}
              onRegenerateCopy={handleRegenerateCopy}
              onRegenerateImage={handleRegenerateImage}
            />
          ))}
        </div>
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No candidates remain pending in this batch. Its outcome has already been decided.
          </p>
        )}
        <Button variant="outline" onClick={handleRequestNew}>Request New Candidates</Button>
      </div>
    );
  }

  async function handleSaveEdits(fields: { linkedinCopy: string; xCopy: string; headline: string }) {
    await guarded(() =>
      api(`/api/candidates/${selected!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...fields, changeReason: "Reviewer edit" }),
      })
    );
  }

  async function handleApprove() {
    await guarded(() => api(`/api/candidates/${selected!.id}/approve`, { method: "POST", body: JSON.stringify({ reviewerConfirmed: true }) }));
  }

  async function ensurePublications(platforms: Platform[]) {
    const { publications } = await api(`/api/publications`, {
      method: "POST",
      body: JSON.stringify({ candidateId: selected!.id, platforms }),
    });
    return publications as { id: string; platform: Platform }[];
  }

  async function handlePublishNow(platforms: Platform[]) {
    await guarded(async () => {
      const publications = await ensurePublications(platforms);
      for (const pub of publications) {
        await api(`/api/publications/${pub.id}/publish`, { method: "POST", body: JSON.stringify({}) });
      }
    });
  }

  async function handleSchedule(platforms: Platform[], scheduledTime: string) {
    await guarded(async () => {
      const publications = await ensurePublications(platforms);
      for (const pub of publications) {
        await api(`/api/publications/${pub.id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledTime }) });
      }
    });
  }

  async function handleSaveManual(platforms: Platform[]) {
    await guarded(async () => {
      const publications = await ensurePublications(platforms);
      for (const pub of publications) {
        await api(`/api/publications/${pub.id}/publish`, { method: "POST", body: JSON.stringify({ manualOnly: true }) });
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <CandidateEditor
        candidate={selected}
        onSaveEdits={handleSaveEdits}
        onRegenerateImage={() => handleRegenerateImage(selected.id)}
        onApprove={handleApprove}
        onReturnToEditing={() => setError(null)}
        onPublishNow={handlePublishNow}
        onSchedule={handleSchedule}
        onSaveManual={handleSaveManual}
      />
    </div>
  );
}
