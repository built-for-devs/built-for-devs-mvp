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

interface ScoreBuyConfirmationEmailProps {
  recipientName: string;
  productName: string;
  numEvaluations: number;
  totalPrice: number;
  reportUrl: string;
  signupUrl: string;
}

export function ScoreBuyConfirmationEmail({
  recipientName,
  productName,
  numEvaluations,
  totalPrice,
  reportUrl,
  signupUrl,
}: ScoreBuyConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>Your Developer Evaluations Are Booked</Text>
          <Text style={paragraph}>Hi {recipientName},</Text>
          <Text style={paragraph}>
            Thanks for your purchase! Here&apos;s a summary:
          </Text>
          <Text style={paragraph}>
            <strong>Product:</strong> {productName}
            <br />
            <strong>Evaluations:</strong> {numEvaluations}
            <br />
            <strong>Total:</strong> ${totalPrice.toLocaleString()}
          </Text>

          <Text style={subheading}>What Happens Next</Text>
          <Text style={paragraph}>
            1. We&apos;ll match developers from our network who fit your target
            profile within 48 hours.
          </Text>
          <Text style={paragraph}>
            2. Each developer will try your product cold and record their screen
            + honest reactions.
          </Text>
          <Text style={paragraph}>
            3. You&apos;ll receive the recordings plus a findings report
            highlighting friction points and quick wins.
          </Text>

          <Section style={btnContainer}>
            <Button style={button} href={reportUrl}>
              View Your Score Report
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={paragraph}>
            Create a free account to track your evaluations in real-time:
          </Text>
          <Section style={btnContainer}>
            <Button style={secondaryButton} href={signupUrl}>
              Create Account
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
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
};
const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  marginBottom: "24px",
};
const subheading = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  marginTop: "24px",
  marginBottom: "12px",
};
const paragraph = { fontSize: "16px", lineHeight: "26px", color: "#333" };
const btnContainer = { textAlign: "center" as const, margin: "32px 0" };
const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
};
const secondaryButton = {
  ...button,
  backgroundColor: "#ffffff",
  color: "#18181b",
  border: "1px solid #18181b",
};
const hr = { borderColor: "#e6ebf1", margin: "32px 0" };
const footer = { color: "#8898aa", fontSize: "12px" };
