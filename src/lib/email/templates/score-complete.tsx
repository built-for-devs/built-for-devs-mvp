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
import type { Classification } from "@/lib/score/types";

interface ScoreCompleteEmailProps {
  recipientName: string;
  productName: string;
  finalScore: number;
  classification: Classification;
  verdict: string;
  quickWins: Array<{ recommendation: string; impact: string; effort: string }>;
  reportUrl: string;
}

const CLASSIFICATION_LABELS: Record<Classification, string> = {
  exceptional: "Exceptional",
  excellent: "Excellent",
  good: "Good",
  needs_work: "Needs Work",
  poor: "Poor",
};

export function ScoreCompleteEmail({
  recipientName,
  productName,
  finalScore,
  classification,
  verdict,
  quickWins,
  reportUrl,
}: ScoreCompleteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>Your Developer Adoption Score is Ready</Text>
          <Text style={paragraph}>Hi {recipientName},</Text>
          <Text style={paragraph}>
            <strong>{productName}</strong> scored{" "}
            <strong>{finalScore}/120</strong> (
            {CLASSIFICATION_LABELS[classification]}).
          </Text>
          <Text style={paragraph}>{verdict}</Text>

          {quickWins.length > 0 && (
            <>
              <Text style={subheading}>Top Quick Wins</Text>
              {quickWins.map((win, i) => (
                <Text key={i} style={paragraph}>
                  {i + 1}. {win.recommendation}
                </Text>
              ))}
            </>
          )}

          <Section style={btnContainer}>
            <Button style={button} href={reportUrl}>
              View Full Report
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={paragraph}>
            Want to know what real developers think? The score evaluates your
            public-facing web presence, but only hands-on testing reveals the
            full developer experience.
          </Text>
          <Section style={btnContainer}>
            <Button style={secondaryButton} href="https://builtfor.dev">
              Learn About Built for Devs Evaluations
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
