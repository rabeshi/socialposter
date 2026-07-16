import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  GENERATING: "outline",
  GENERATION_FAILED: "destructive",
  PENDING_REVIEW: "warning",
  REVISION_REQUESTED: "warning",
  CANDIDATE_SELECTED: "secondary",
  NOT_SELECTED: "outline",
  REJECTED: "destructive",
  APPROVED: "secondary",
  SCHEDULED: "secondary",
  PUBLISHING: "warning",
  PUBLISHED: "success",
  PARTIALLY_PUBLISHED: "warning",
  PUBLICATION_FAILED: "destructive",
  READY_FOR_MANUAL_PUBLISHING: "warning",
  CANCELLED: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>{status.replaceAll("_", " ")}</Badge>;
}
