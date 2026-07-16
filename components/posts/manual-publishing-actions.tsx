"use client";

import { Button } from "@/components/ui/button";

const PLATFORM_URLS: Record<string, string> = {
  LINKEDIN: "https://www.linkedin.com/company/liceo-inc/",
  X: "https://x.com/Liceo_io",
};

export function ManualPublishingActions({ platform, copy, imageUrl }: { platform: string; copy: string; imageUrl: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(copy)}>
        Copy {platform === "LINKEDIN" ? "LinkedIn" : "X"} Text
      </Button>
      {imageUrl && (
        <Button size="sm" variant="outline" asChild>
          <a href={imageUrl} download>
            Download {platform === "LINKEDIN" ? "LinkedIn" : "X"} Image
          </a>
        </Button>
      )}
      <Button size="sm" variant="outline" asChild>
        <a href={PLATFORM_URLS[platform]} target="_blank" rel="noreferrer">
          Open Liceo {platform === "LINKEDIN" ? "LinkedIn Page" : "X Account"}
        </a>
      </Button>
    </div>
  );
}
