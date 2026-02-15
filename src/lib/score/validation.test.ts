import { describe, it, expect } from "vitest";
import { scoreSubmitSchema } from "./validation";

describe("scoreSubmitSchema", () => {
  describe("url", () => {
    it("accepts a valid HTTPS URL", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "https://example.com",
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.url).toBe("https://example.com");
    });

    it("accepts a valid HTTP URL", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "http://example.com",
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("auto-prepends https:// when no protocol provided", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "example.com",
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.url).toBe("https://example.com");
    });

    it("auto-prepends https:// for subdomain URLs", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "docs.stripe.com",
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
      if (result.success)
        expect(result.data.url).toBe("https://docs.stripe.com");
    });

    it("rejects empty URL", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "",
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects localhost", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "http://localhost:3000",
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects IP addresses", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "http://192.168.1.1",
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects .local domains", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "http://myapp.local",
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects dotless hostnames", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "https://intranet",
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("email", () => {
    it("accepts a valid email", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "https://example.com",
        email: "user@company.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid email", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "https://example.com",
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    it("accepts submission with all optional fields", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "https://example.com",
        email: "test@example.com",
        name: "Jane Doe",
        company_name: "Acme Inc",
        admin_note: "Priority review",
      });
      expect(result.success).toBe(true);
    });

    it("rejects admin_note exceeding 1000 characters", () => {
      const result = scoreSubmitSchema.safeParse({
        url: "https://example.com",
        email: "test@example.com",
        admin_note: "x".repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });
});
