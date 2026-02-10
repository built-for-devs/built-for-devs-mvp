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

interface AcceptanceConfirmationEmailProps {
  developerName: string;
  productName: string;
  recordingUrl: string;
  deadline: string;
}

export function AcceptanceConfirmationEmail({
  developerName,
  productName,
  recordingUrl,
  deadline,
}: AcceptanceConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>You&apos;re In!</Text>
          <Text style={paragraph}>Hi {developerName},</Text>
          <Text style={paragraph}>
            You&apos;ve accepted the invitation to evaluate{" "}
            <strong>{productName}</strong>. Here&apos;s what to do next:
          </Text>
          <Text style={paragraph}>
            1. Try out the product and form your impressions
            {"\n"}2. Record your screen walkthrough with your mic on
            {"\n"}3. Submit your recording by <strong>{deadline}</strong>
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={recordingUrl}>
              Start Recording
            </Button>
          </Section>
          <Text style={paragraph}>
            Make sure your microphone and screen recording are turned on before
            you get started.
          </Text>
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
