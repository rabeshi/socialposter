import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Preview, Row, Section, Text } from "@react-email/components";

export interface Candidate { category: string; hook: string; linkedinPreview: string; xPreview: string; imageUrl: string; suggestedTime: string; }
interface Props { generatedDate: string; candidates: Candidate[]; reviewUrl: string; rejectAllUrl: string; requestNewUrl: string; appUrl: string; }
const navy = "#102a43", blue = "#1d4ed8", muted = "#52667a", border = "#dce5ef";

export default function ApprovalEmail({ generatedDate, candidates, reviewUrl, rejectAllUrl, requestNewUrl, appUrl }: Props) {
  return <Html><Head /><Preview>{`Your next ${candidates.length} Liceo posts are ready for review`}</Preview><Body style={body}><Container style={container}>
    <Section style={brandBar}><Text style={brand}>Liceo Social</Text></Section>
    <Section style={hero}><Text style={eyebrow}>CONTENT REVIEW</Text><Heading style={heading}>Your next social media posts are ready</Heading>
      <Text style={copy}>Hi George,</Text><Text style={copy}>We&apos;ve generated {candidates.length} new social media post candidates based on your content strategy.</Text>
      <Text style={notice}>Nothing will be published until you review, approve, and confirm a post within the Liceo dashboard.</Text></Section>
    <Section style={content}><Heading as="h2" style={sectionHeading}>Posts awaiting review</Heading><Text style={date}>Generated {generatedDate}</Text>
      {candidates.map((c, index) => <Section key={`${c.category}-${index}`} style={card}><Img src={c.imageUrl} width="568" alt={`${c.category} social post artwork`} style={image} /><Section style={cardBody}>
        <Text style={category}>{c.category}</Text><Text style={label}>Theme</Text><Text style={theme}>{c.hook}</Text>
        <Text style={label}>LinkedIn preview</Text><Text style={preview}>{c.linkedinPreview}</Text>
        <Text style={label}>X preview</Text><Text style={preview}>{c.xPreview}</Text>
        <Text style={label}>Recommended publishing time</Text><Text style={time}>{c.suggestedTime}</Text>
        <Button href={reviewUrl} style={reviewPost}>Review post →</Button></Section></Section>)}
    </Section>
    <Section style={steps}><Heading as="h2" style={sectionHeading}>What happens next?</Heading>
      <Text style={step}>1. Review each proposed post.</Text><Text style={step}>2. Edit the text or image if needed.</Text><Text style={step}>3. Select the post you&apos;d like to publish.</Text><Text style={step}>4. Confirm publication.</Text>
      <Text style={assurance}>No content will ever be published without your approval.</Text><Section style={{ textAlign: "center", margin: "28px 0 14px" }}><Button href={reviewUrl} style={primary}>Review Dashboard</Button></Section>
      <Row><Column align="right" style={{ paddingRight: "6px" }}><Button href={requestNewUrl} style={secondary}>Generate New Posts</Button></Column><Column align="left" style={{ paddingLeft: "6px" }}><Button href={rejectAllUrl} style={danger}>Reject All</Button></Column></Row>
    </Section><Hr style={{ borderColor: border, margin: 0 }} /><Section style={footer}><Text style={footerBrand}>Liceo Social</Text><Text style={footerText}>AI-powered social media content for modern SaaS companies.</Text><Text style={fine}>This secure review link is unique to your account and expires in 7 days.</Text><Text style={fine}>© 2026 Liceo Inc. All rights reserved.</Text><Text style={fine}><a href={appUrl} style={{ color: blue }}>Open Liceo Social</a></Text></Section>
  </Container></Body></Html>;
}

const body = { backgroundColor: "#f4f7fb", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "24px 0" };
const container = { backgroundColor: "#fff", border: `1px solid ${border}`, borderRadius: "12px", margin: "0 auto", maxWidth: "640px", overflow: "hidden" };
const brandBar = { backgroundColor: navy, padding: "20px 32px" }, brand = { color: "#fff", fontSize: "19px", fontWeight: "700", margin: 0 };
const hero = { padding: "36px 36px 28px" }, eyebrow = { color: blue, fontSize: "11px", fontWeight: "700", letterSpacing: "1.2px", margin: "0 0 10px" }, heading = { color: navy, fontSize: "28px", lineHeight: "35px", margin: "0 0 24px" }, copy = { color: "#273b4f", fontSize: "15px", lineHeight: "24px", margin: "0 0 12px" };
const notice = { backgroundColor: "#edf4ff", borderLeft: `4px solid ${blue}`, color: navy, fontSize: "14px", lineHeight: "22px", margin: "22px 0 0", padding: "14px 16px" };
const content = { backgroundColor: "#f8fafc", padding: "30px 36px" }, sectionHeading = { color: navy, fontSize: "20px", lineHeight: "26px", margin: 0 }, date = { color: muted, fontSize: "12px", margin: "6px 0 20px" };
const card = { backgroundColor: "#fff", border: `1px solid ${border}`, borderRadius: "10px", margin: "0 0 20px", overflow: "hidden" }, image = { display: "block", height: "240px", objectFit: "cover" as const, width: "100%" }, cardBody = { padding: "22px 24px 24px" };
const category = { color: blue, fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px", margin: "0 0 18px", textTransform: "uppercase" as const }, label = { color: muted, fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", margin: "16px 0 5px", textTransform: "uppercase" as const }, theme = { color: navy, fontSize: "17px", fontWeight: "700", lineHeight: "24px", margin: 0 }, preview = { color: "#334e68", fontSize: "14px", lineHeight: "22px", margin: 0 }, time = { color: navy, fontSize: "14px", fontWeight: "700", margin: 0 }, reviewPost = { color: blue, fontSize: "14px", fontWeight: "700", marginTop: "20px", padding: 0 };
const steps = { padding: "32px 36px" }, step = { color: "#334e68", fontSize: "14px", lineHeight: "21px", margin: "9px 0" }, assurance = { color: navy, fontSize: "14px", fontWeight: "700", lineHeight: "22px", margin: "22px 0" }, primary = { backgroundColor: blue, borderRadius: "7px", color: "#fff", fontSize: "14px", fontWeight: "700", padding: "13px 28px" }, secondary = { border: `1px solid ${border}`, borderRadius: "7px", color: navy, fontSize: "12px", fontWeight: "700", padding: "10px 14px" }, danger = { border: "1px solid #efcaca", borderRadius: "7px", color: "#a61b1b", fontSize: "12px", fontWeight: "700", padding: "10px 14px" };
const footer = { backgroundColor: "#f8fafc", padding: "28px 36px", textAlign: "center" as const }, footerBrand = { color: navy, fontSize: "15px", fontWeight: "700", margin: "0 0 6px" }, footerText = { color: muted, fontSize: "12px", lineHeight: "19px", margin: "0 0 16px" }, fine = { color: "#7b8fa3", fontSize: "10px", lineHeight: "16px", margin: "4px 0" };
