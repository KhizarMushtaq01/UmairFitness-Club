import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { sendEmail } from "@/lib/email";
import { sendContactMessage } from "./actions";

const mockedSend = sendEmail as unknown as Mock;
const valid = {
  name: "Ali Raza",
  email: "ali@example.com",
  message: "I would like to ask about the Fighter plan and class timings.",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedSend.mockResolvedValue({ id: "stub-1" });
});

describe("sendContactMessage", () => {
  it("rejects a malformed email without sending", async () => {
    await expect(sendContactMessage({ ...valid, email: "not-an-email" })).rejects.toThrow();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("rejects a message that is too short without sending", async () => {
    await expect(sendContactMessage({ ...valid, message: "hi" })).rejects.toThrow();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("sends the enquiry on valid input", async () => {
    const result = await sendContactMessage(valid);

    expect(result).toEqual({ ok: true });
    expect(mockedSend).toHaveBeenCalledTimes(1);
    const arg = mockedSend.mock.calls[0][0];
    expect(arg.to).toBe("hello@umairfitness.gym");
    expect(arg.subject).toContain("Ali Raza");
    expect(arg.html).toContain("ali@example.com");
  });

  it("escapes HTML markup in name and message before building the email", async () => {
    await sendContactMessage({
      name: '<img src=x onerror=alert(1)>',
      email: "ali@example.com",
      message: 'Click <a href="https://evil.example">here</a> & "win" a prize',
    });

    expect(mockedSend).toHaveBeenCalledTimes(1);
    const arg = mockedSend.mock.calls[0][0];

    // The raw markup must never appear unescaped in the HTML body.
    expect(arg.html).not.toContain("<img");
    expect(arg.html).not.toContain('<a href="https://evil.example">');

    // The escaped form must be present instead.
    expect(arg.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(arg.html).toContain(
      "Click &lt;a href=&quot;https://evil.example&quot;&gt;here&lt;/a&gt; &amp; &quot;win&quot; a prize"
    );
  });
});
