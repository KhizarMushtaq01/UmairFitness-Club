import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    notification: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notify } from "./notify";

const mockedCreate = db.notification.create as unknown as Mock;
const mockedFindUser = db.user.findUnique as unknown as Mock;
const mockedSendEmail = sendEmail as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreate.mockResolvedValue({ id: "n1" });
  mockedFindUser.mockResolvedValue({ id: "u1", email: "m@example.com" });
  mockedSendEmail.mockResolvedValue({ id: "e1" });
});

describe("notify", () => {
  it("writes the in-app notification", async () => {
    await notify("u1", "Booked", "You are confirmed.");
    expect(mockedCreate).toHaveBeenCalledWith({
      data: { userId: "u1", title: "Booked", body: "You are confirmed." },
    });
  });

  it("emails the notification to the user", async () => {
    await notify("u1", "Booked", "You are confirmed.");
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "m@example.com", subject: "Booked" })
    );
  });

  it("keeps the in-app notification when email delivery fails", async () => {
    mockedSendEmail.mockRejectedValue(new Error("resend down"));

    await expect(notify("u1", "Booked", "You are confirmed.")).resolves.toBeUndefined();
    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it("still writes the notification when the user has no email on file", async () => {
    mockedFindUser.mockResolvedValue(null);

    await notify("u1", "Booked", "You are confirmed.");
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });
});
