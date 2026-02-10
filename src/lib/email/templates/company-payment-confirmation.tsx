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

interface CompanyPaymentConfirmationEmailProps {
  contactName: string;
  projectName: string;
  dashboardUrl: string;
}

export function CompanyPaymentConfirmationEmail({
  contactName,
  projectName,
  dashboardUrl,
}: CompanyPaymentConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>Payment Confirmed</Text>
          <Text style={paragraph}>Hi {contactName},</Text>
          <Text style={paragraph}>
            Your payment for <strong>{projectName}</strong> has been received.
            We&apos;re now matching developers to evaluate your product.
          </Text>
          <Text style={paragraph}>
            You&apos;ll receive an email as each evaluation is completed. You
            can also check progress anytime from your dashboard.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={dashboardUrl}>
              View Project
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
