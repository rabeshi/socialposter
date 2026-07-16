import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button } from "@react-email/components";

export interface PublicationResultEmailProps {
  hook: string;
  linkedinResult?: { status: string; url?: string };
  xResult?: { status: string; url?: string };
  dashboardUrl: string;
}

export default function PublicationResultEmail({ hook, linkedinResult, xResult, dashboardUrl }: PublicationResultEmailProps) {
  const partial =
    (linkedinResult?.status === "PUBLISHED" && xResult && xResult.status !== "PUBLISHED") ||
    (xResult?.status === "PUBLISHED" && linkedinResult && linkedinResult.status !== "PUBLISHED");

  return (
    <Html>
      <Head />
      <Preview>{partial ? "Partial publication result for a Liceo post" : "Publication result for a Liceo post"}</Preview>
      <Body style={{ backgroundColor: "#f4f6f8", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ color: "#0B2545", fontSize: "18px" }}>
            {partial ? "Partially published" : "Publication update"}
          </Heading>
          <Text style={{ fontSize: "14px", color: "#222" }}>&ldquo;{hook}&rdquo;</Text>
          {linkedinResult && (
            <Text style={{ fontSize: "13px" }}>
              LinkedIn: <strong>{linkedinResult.status}</strong>{linkedinResult.url ? ` — ${linkedinResult.url}` : ""}
            </Text>
          )}
          {xResult && (
            <Text style={{ fontSize: "13px" }}>
              X: <strong>{xResult.status}</strong>{xResult.url ? ` — ${xResult.url}` : ""}
            </Text>
          )}
          {partial && (
            <Text style={{ fontSize: "13px", color: "#a15c00" }}>
              One platform did not publish successfully. You can retry only the failed platform from the dashboard.
            </Text>
          )}
          <Section style={{ marginTop: "20px", textAlign: "center" }}>
            <Button
              href={dashboardUrl}
              style={{ backgroundColor: "#134074", color: "#fff", padding: "12px 24px", borderRadius: "6px", fontSize: "14px" }}
            >
              Open Dashboard
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
