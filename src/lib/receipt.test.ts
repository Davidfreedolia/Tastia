import { describe, it, expect, afterEach } from "vitest";
import process from "node:process";
import { buildReceiptEmail } from "./receipt";

const base = {
  to: "buyer@example.com",
  accessCode: "ABCD2345",
  totalCents: 12500,
  activationUrl: "https://tastia.org/activar?code=ABCD2345",
  qrDataUrl: "data:image/png;base64,AAAA",
  livemode: true,
};

describe("buildReceiptEmail", () => {
  afterEach(() => {
    delete process.env.RESEND_FROM;
  });

  it("includes the access code, the activation URL and an <img> for the QR", () => {
    const { html } = buildReceiptEmail(base);
    expect(html).toContain(base.accessCode);
    expect(html).toContain(base.activationUrl);
    expect(html).toContain(`<a href="${base.activationUrl}">`);
    expect(html).toContain("<img");
    expect(html).toContain(base.qrDataUrl);
  });

  it("includes the imported amount formatted with two decimals and €", () => {
    const { html } = buildReceiptEmail(base);
    expect(html).toContain("125.00 €");
  });

  it("shows the test-payment note when livemode is false", () => {
    const { html } = buildReceiptEmail({ ...base, livemode: false });
    expect(html).toContain("PRUEBA");
  });

  it("does NOT show the test-payment note when livemode is true", () => {
    const { html } = buildReceiptEmail({ ...base, livemode: true });
    expect(html).not.toContain("PRUEBA");
  });

  it("has a non-empty subject", () => {
    const { subject } = buildReceiptEmail(base);
    expect(subject.length).toBeGreaterThan(0);
  });

  it("uses RESEND_FROM when set", () => {
    process.env.RESEND_FROM = "Tastia Test <hola@tastia.org>";
    const { from } = buildReceiptEmail(base);
    expect(from).toBe("Tastia Test <hola@tastia.org>");
  });

  it("falls back to the default sender when RESEND_FROM is unset", () => {
    delete process.env.RESEND_FROM;
    const { from } = buildReceiptEmail(base);
    expect(from).toBe("Tastia <onboarding@resend.dev>");
  });

  it("carries the recipient through", () => {
    const { to } = buildReceiptEmail(base);
    expect(to).toBe(base.to);
  });
});
