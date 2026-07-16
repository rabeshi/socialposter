"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Category, ContentStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface PostsFilterInitial {
  status?: string;
  category?: string;
  keyword?: string;
  from?: string;
  to?: string;
}

export function PostsFilterBar({ initial }: { initial: PostsFilterInitial }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initial.keyword ?? "");
  const [status, setStatus] = useState(initial.status ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/posts?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-4">
      <div>
        <Label className="text-xs">Keyword</Label>
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search hook or copy" />
      </div>
      <div>
        <Label className="text-xs">Status</Label>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any</option>
          {Object.values(ContentStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Category</Label>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Any</option>
          {Object.values(Category).map((c) => (
            <option key={c} value={c}>{c.replaceAll("_", " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">To</Label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Button onClick={apply}>Apply</Button>
    </div>
  );
}
