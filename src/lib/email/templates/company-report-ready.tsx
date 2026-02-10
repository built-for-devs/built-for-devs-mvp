import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface CompanyReportReadyEmailProps {
  contactName: string;
  projectName: string;
  projectUrl: string;
}

export function CompanyReportReadyEmail({
  contactName,
  projectName,
  projectUrl,
}: CompanyReportReadyEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>Your Findings Report is Ready</Text>
          <Text style={paragraph}>Hi {contactName},</Text>
          <Text style={paragraph}>
            The findings report for <strong>{projectName}</strong> is now
            available. This report summarizes the developer evaluations and key
            insights about your product&apos;s developer experience.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={projectUrl}>
              View Report
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Built for Devs — Real developer feedback for dev tools.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px 20px", maxWidth: "560px" };
const heading = { fontSize: "24px", fontWeight: "bold" as const, marginBottom: "24px" };
const paragraph = { fontSize: "16px", lineHeight: "26px", color: "#333" };
const btnContainer = { textAlign: "center" as const, margin: "32px 0" };
const button = { backgroundColor: "#18181b", borderRadius: "6px", color: "#fff", fontSize: "16px", fontWeight: "bold" as const, textDecoration: "none", textAlign: "center" as const, padding: "12px 24px" };
const hr = { borderColor: "#e6ebf1", margin: "32px 0" };
const footer = { color: "#8898aa", fontSize: "12px" };
