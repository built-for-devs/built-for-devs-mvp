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

interface InvitationEmailProps {
  developerName: string;
  productName: string;
  payoutAmount: number;
  evaluationUrl: string;
  expiresIn: string;
  isImported?: boolean;
}

export function InvitationEmail({
  developerName,
  productName,
  payoutAmount,
  evaluationUrl,
  expiresIn,
  isImported = false,
}: InvitationEmailProps) {
  if (isImported) {
    return (
      <Html>
        <Head />
        <Body style={body}>
          <Container style={container}>
            <Text style={paragraph}>Hi {developerName},</Text>
            <Text style={paragraph}>
              I&apos;m Tessa Kriesel, founder of Built for Devs. I came across
              your profile and your experience aligns perfectly with a product
              that needs developer feedback.
            </Text>
            <Text style={paragraph}>
              Built for Devs connects experienced developers with dev tool
              companies that need honest, hands-on evaluations. We pay
              developers <strong>${payoutAmount}</strong> per evaluation — you
              try the product, share your experience, and get paid.
            </Text>
            <Text style={paragraph}>
              Right now, we have <strong>{productName}</strong> looking for
              evaluators with your background. If you&apos;re interested, click
              below to learn more and accept.
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={evaluationUrl}>
                View Opportunity
              </Button>
            </Section>
            <Text style={paragraph}>
              This opportunity expires in <strong>{expiresIn}</strong>.
            </Text>
            <Hr style={hr} />
            <Text style={signoff}>
              Tessa Kriesel
              <br />
              Founder, Built for Devs
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }

  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>New Evaluation Invitation</Text>
          <Text style={paragraph}>Hi {developerName},</Text>
          <Text style={paragraph}>
            You&apos;ve been invited to evaluate <strong>{productName}</strong> as
            part of the Built for Devs program. The payout for this evaluation is{" "}
            <strong>${payoutAmount}</strong>.
          </Text>
          <Text style={paragraph}>
            Please respond within <strong>{expiresIn}</strong>.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={evaluationUrl}>
              View Invitation
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
const signoff = { fontSize: "14px", lineHeight: "22px", color: "#333" };
const footer = { color: "#8898aa", fontSize: "12px" };
