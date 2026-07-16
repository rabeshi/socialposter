import { IntegrationCard } from "@/components/forms/integration-card";

const SERVICES = [
  { service: "openai" as const, label: "OpenAI", description: "Text and image generation, embeddings." },
  { service: "resend" as const, label: "Resend", description: "Approval, reminder, and publication-result emails." },
  { service: "linkedin" as const, label: "LinkedIn", description: "Organization page publishing.", connectUrl: "/api/integrations/linkedin/connect" },
  { service: "x" as const, label: "X", description: "Account publishing.", connectUrl: "/api/integrations/x/connect" },
  { service: "neon" as const, label: "Neon (Postgres)", description: "Primary application database." },
  { service: "blob" as const, label: "Vercel Blob", description: "Image and brand asset storage." },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connection status for every external service. Secrets are never displayed.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SERVICES.map((s) => (
          <IntegrationCard key={s.service} {...s} />
        ))}
      </div>
    </div>
  );
}
