"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FEATURED_IMAGE_TYPES, featuredImageValidationError } from "@/lib/storage/featured-image";

interface BrandFormValues {
  companyDescription: string;
  productDescription: string;
  brandVoice: string;
  approvedTerms: string;
  prohibitedTerms: string;
  brandColors: string;
  website: string;
  standardHashtags: string;
  approvalEmailRecipients: string;
  logoUrl: string | null;
  featuredImageUrl: string | null;
}

export function BrandSettingsForm({ brand }: { brand: BrandFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(brand);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [featuredImageBusy, setFeaturedImageBusy] = useState(false);
  const [featuredImageMessage, setFeaturedImageMessage] = useState<string | null>(null);

  async function handleFeaturedImage(file?: File) {
    setFeaturedImageMessage(null);
    if (file) {
      const error = featuredImageValidationError(file);
      if (error) {
        setFeaturedImageMessage(error);
        return;
      }
    }
    setFeaturedImageBusy(true);
    try {
      const body = new FormData();
      if (file) body.append("file", file);
      const res = await fetch("/api/uploads/featured-image", {
        method: file ? "POST" : "DELETE",
        ...(file ? { body } : {}),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not update the featured image.");
      set("featuredImageUrl", result.featuredImageUrl);
      setFeaturedImageMessage(file ? "Featured image saved." : "Featured image removed.");
      router.refresh();
    } catch (error) {
      setFeaturedImageMessage(error instanceof Error ? error.message : "Could not update the featured image.");
    } finally {
      setFeaturedImageBusy(false);
    }
  }

  function set<K extends keyof BrandFormValues>(key: K, val: BrandFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyDescription: values.companyDescription,
          productDescription: values.productDescription,
          brandVoice: values.brandVoice,
          approvedTerms: splitList(values.approvedTerms),
          prohibitedTerms: splitList(values.prohibitedTerms),
          brandColors: splitList(values.brandColors),
          website: values.website,
          standardHashtags: splitList(values.standardHashtags),
          approvalEmailRecipients: splitList(values.approvalEmailRecipients),
        }),
      });
      if (!res.ok) throw new Error("Failed to save brand settings.");
      setMessage("Saved.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/logo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Logo upload failed.");
      setMessage("Logo uploaded.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company &amp; Voice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 border-b pb-6" aria-busy={featuredImageBusy}>
          <Label htmlFor="brand-featured-image">Featured image</Label>
          {values.featuredImageUrl ? (
            <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-lg border bg-muted">
              <Image src={values.featuredImageUrl} alt="Brand featured image" fill unoptimized sizes="(max-width: 768px) 100vw, 672px" className="object-contain" />
            </div>
          ) : (
            <div className="flex aspect-video w-full max-w-2xl items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
              Upload an image to feature your brand.
            </div>
          )}
          <Input
            id="brand-featured-image"
            type="file"
            accept={FEATURED_IMAGE_TYPES.join(",")}
            disabled={featuredImageBusy}
            aria-describedby="brand-featured-image-help"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleFeaturedImage(file);
            }}
          />
          <p id="brand-featured-image-help" className="text-xs text-muted-foreground">
            PNG, JPEG, or WebP up to 4 MB. A landscape image works best. Uploads save automatically.
          </p>
          {values.featuredImageUrl && (
            <Button type="button" variant="outline" disabled={featuredImageBusy} onClick={() => void handleFeaturedImage()}>
              Remove featured image
            </Button>
          )}
          <p role="status" aria-live="polite" className="text-sm">
            {featuredImageBusy ? "Updating featured image..." : featuredImageMessage}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Company description</Label>
          <Textarea rows={3} value={values.companyDescription} onChange={(e) => set("companyDescription", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Product description</Label>
          <Textarea rows={3} value={values.productDescription} onChange={(e) => set("productDescription", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Brand voice</Label>
          <Textarea rows={3} value={values.brandVoice} onChange={(e) => set("brandVoice", e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Approved terms (comma-separated)</Label>
            <Input value={values.approvedTerms} onChange={(e) => set("approvedTerms", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Prohibited terms (comma-separated)</Label>
            <Input value={values.prohibitedTerms} onChange={(e) => set("prohibitedTerms", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Brand colors (hex, comma-separated)</Label>
            <Input value={values.brandColors} onChange={(e) => set("brandColors", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={values.website} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Standard hashtags (comma-separated)</Label>
            <Input value={values.standardHashtags} onChange={(e) => set("standardHashtags", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Approval email recipients (comma-separated)</Label>
            <Input value={values.approvalEmailRecipients} onChange={(e) => set("approvalEmailRecipients", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>Official logo</Label>
          {values.logoUrl && <img src={values.logoUrl} alt="Liceo logo" className="h-16 rounded border bg-white p-2" />}
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
            }}
          />
          <p className="text-xs text-muted-foreground">
            The logo is placed discreetly in the bottom-right corner of generated images only once uploaded here.
          </p>
        </div>

        {message && <p className="text-sm">{message}</p>}
      </CardContent>
      <CardFooter>
        <Button disabled={saving} onClick={handleSave}>{saving ? "Saving..." : "Save Brand Settings"}</Button>
      </CardFooter>
    </Card>
  );
}

function splitList(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}
