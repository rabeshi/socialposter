"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeletePostButton({ postId, hook }: { postId: string; hook: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function removePost() {
    if (!window.confirm(`Permanently delete “${hook}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/candidates/${postId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("The post could not be deleted.");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The post could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={removePost}>{busy ? "Deleting…" : "Delete"}</Button>;
}
