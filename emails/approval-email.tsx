import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Button,
  Hr,
  Row,
  Column,
} from "@react-email/components";

export interface ApprovalEmailCandidate {
  category: string;
  hook: string;
  linkedinPreview: string;
  xPreview: string;
  imageUrl: string;
  suggestedTime: string;
}

export interface ApprovalEmailProps {
  batchId: string;
  generatedDate: string;
  candidates: ApprovalEmailCandidate[];
  reviewUrl: string;
  rejectAllUrl: string;
  requestNewUrl: string;
  appUrl: string;
}

export default function ApprovalEmail({
  batchId,
  generatedDate,
  candidates,
  reviewUrl,
  rejectAllUrl,
  requestNewUrl,
}: ApprovalEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Three new Liceo post candidates are ready for your review</Preview>
      <Body style={{ backgroundColor: "#f4f6f8", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "640px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ color: "#0B2545", fontSize: "20px" }}>Liceo Social — New Candidates Ready</Heading>
          <Text style={{ color: "#415a77", fontSize: "13px" }}>
            Generated {generatedDate} · Batch #{batchId.slice(0, 8)}
          </Text>
          <Text style={{ fontSize: "14px", color: "#222" }}>
            Three post candidates are waiting for your review. Nothing will be published until you select one,
            edit it if needed, and separately confirm publication inside the dashboard.
          </Text>

          {candidates.map((c, i) => (
            <Section key={i} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", marginTop: "16px", padding: "16px" }}>
              <Row>
                <Column style={{ width: "160px" }}>
                  <Img src={c.imageUrl} width="160" height="84" alt="" style={{ borderRadius: "6px", objectFit: "cover" }} />
                </Column>
                <Column style={{ paddingLeft: "16px" }}>
                  <Text style={{ fontSize: "11px", textTransform: "uppercase", color: "#8DA9C4", margin: 0 }}>{c.category}</Text>
                  <Text style={{ fontWeight: "bold", margin: "4px 0" }}>{c.hook}</Text>
                  <Text style={{ fontSize: "12px", color: "#555", margin: 0 }}>LinkedIn: {c.linkedinPreview}…</Text>
                  <Text style={{ fontSize: "12px", color: "#555" }}>X: {c.xPreview}…</Text>
                  <Text style={{ fontSize: "11px", color: "#8DA9C4" }}>Suggested: {c.suggestedTime}</Text>
                </Column>
              </Row>
            </Section>
          ))}

          <Section style={{ marginTop: "24px", textAlign: "center" }}>
            <Button
              href={reviewUrl}
              style={{ backgroundColor: "#134074", color: "#fff", padding: "12px 24px", borderRadius: "6px", fontSize: "14px" }}
            >
              Open Review Dashboard
            </Button>
          </Section>

          <Hr style={{ margin: "24px 0", borderColor: "#e2e8f0" }} />

          <Section style={{ textAlign: "center" }}>
            <Text style={{ fontSize: "12px", color: "#888" }}>
              <a href={rejectAllUrl} style={{ color: "#888", marginRight: "16px" }}>Reject All</a>
              <a href={requestNewUrl} style={{ color: "#888" }}>Request New Candidates</a>
            </Text>
          </Section>

          <Text style={{ fontSize: "11px", color: "#aaa", marginTop: "24px" }}>
            This link is unique to you and expires after 7 days. Liceo · liceo.io
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
