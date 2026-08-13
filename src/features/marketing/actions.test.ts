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
});
