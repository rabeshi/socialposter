"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Category } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const CATEGORIES = Object.values(Category);

/**
 * Tone/length/image-style/hashtag-count/CTA controls are collected here for
 * a complete manual-generation UI, but in Phase 1 (simulation mode) only
 * `categories` is wired to the generator — the others are recorded for
 * operator intent and become fully effective once Phase 2's configurable
 * OpenAI prompt wiring lands.
 */
export function GenerateForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<Category[]>([
    Category.SAAS_DISCOVERY,
    Category.SAAS_COST_OPTIMIZATION,
    Category.SHADOW_IT,
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(cat: Category) {
    setSelected((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      if (prev.length >= 3) return prev;
      return [...prev, cat];
    });
  }

  async function handleSubmit() {
    if (selected.length !== 3) {
      setError("Select exactly 3 categories.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ? JSON.stringify(body.error) : "Generation failed.");
      }
      const { batch } = await res.json();
      router.push(`/review/${batch.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose exactly 3 categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <label
              key={cat}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${
                selected.includes(cat) ? "border-primary bg-primary/5" : ""
              }`}
            >
              <input type="checkbox" checked={selected.includes(cat)} onChange={() => toggle(cat)} />
              {cat.replaceAll("_", " ")}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Tone</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Calm and confident (default)</option>
              <option>More educational</option>
              <option>More direct</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Platforms</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>LinkedIn only (default)</option>
              <option>LinkedIn + X</option>
              <option>X only</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Content length</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Standard (default)</option>
              <option>Shorter</option>
              <option>Longer</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Image style</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Realistic corporate (default)</option>
              <option>Clean illustration</option>
              <option>Abstract/minimal</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Hashtag count</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>3-5 (default)</option>
              <option>1-2</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Call-to-action preference</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Restrained question (default)</option>
              <option>Insight only, no CTA</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Generating..." : "Generate 3 Candidates"}
        </Button>
      </CardContent>
    </Card>
  );
}
