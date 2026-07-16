import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button } from "@react-email/components";

export interface ReminderEmailProps {
  batchId: string;
  hoursSinceGeneration: number;
  reviewUrl: string;
  reminderNumber: number;
  maxReminders: number;
}

export default function ReminderEmail({ batchId, hoursSinceGeneration, reviewUrl, reminderNumber, maxReminders }: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reminder: a Liceo content batch is still awaiting your review</Preview>
      <Body style={{ backgroundColor: "#f4f6f8", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ color: "#0B2545", fontSize: "18px" }}>Still waiting on your review</Heading>
          <Text style={{ fontSize: "14px", color: "#222" }}>
            Batch #{batchId.slice(0, 8)} has been pending review for about {hoursSinceGeneration} hours.
            This is reminder {reminderNumber} of {maxReminders} — no further reminders will be sent for this batch
            after that.
          </Text>
          <Section style={{ marginTop: "20px", textAlign: "center" }}>
            <Button
              href={reviewUrl}
              style={{ backgroundColor: "#134074", color: "#fff", padding: "12px 24px", borderRadius: "6px", fontSize: "14px" }}
            >
              Review Now
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
