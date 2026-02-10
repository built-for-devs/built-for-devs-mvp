import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
} from "@react-email/components";

interface PaymentSentEmailProps {
  developerName: string;
  productName: string;
  amount: number;
  payoutReference: string;
}

export function PaymentSentEmail({
  developerName,
  productName,
  amount,
  payoutReference,
}: PaymentSentEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>Payment Sent</Text>
          <Text style={paragraph}>Hi {developerName},</Text>
          <Text style={paragraph}>
            Your payment of <strong>${amount}</strong> for the{" "}
            <strong>{productName}</strong> evaluation has been sent.
          </Text>
          {payoutReference && (
            <Text style={paragraph}>
              Reference: <strong>{payoutReference}</strong>
            </Text>
          )}
          <Text style={paragraph}>
            Thank you for your contribution to improving developer tools!
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
const hr = { borderColor: "#e6ebf1", margin: "32px 0" };
const footer = { color: "#8898aa", fontSize: "12px" };
