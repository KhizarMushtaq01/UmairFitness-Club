import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    post: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    galleryImage: { create: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/uploads", () => ({ uploadImage: vi.fn() }));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { uploadImage } from "@/lib/uploads";
import { MAX_UPLOAD_BYTES } from "./schemas";
import {
  publishPost,
  createPost,
  unpublishPost,
  deletePost,
  uploadGalleryImage,
  deleteGalleryImage,
} from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedUpdate = db.post.update as unknown as Mock;
const mockedUpload = uploadImage as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishPost", () => {
  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });
    await expect(publishPost({ postId: "p1" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    await expect(publishPost({ postId: "p1" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("publishes for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    mockedUpdate.mockResolvedValue({ id: "p1", status: "PUBLISHED" });
    const result = await publishPost({ postId: "p1" });
    expect(result).toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "PUBLISHED" },
    });
  });
});

describe("createPost", () => {
  const validInput = { title: "Inside an 8-week fight camp", tag: "Fight camp" };

  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(createPost(validInput)).rejects.toThrow("Forbidden");
    expect(db.post.create).not.toHaveBeenCalled();
  });

  it("rejects a one-character title before touching the database", async () => {
    await expect(createPost({ ...validInput, title: "x" })).rejects.toThrow();
    expect(db.post.create).not.toHaveBeenCalled();
  });

  it("creates the post as a DRAFT, never published straight to the homepage", async () => {
    // getPublicPosts filters on status PUBLISHED, so a default of PUBLISHED
    // here would put an unreviewed post on the public site the moment it was
    // typed. Asserting the exact data object is what pins the default.
    await createPost(validInput);

    expect(db.post.create).toHaveBeenCalledWith({
      data: {
        title: "Inside an 8-week fight camp",
        tag: "Fight camp",
        status: "DRAFT",
        authorId: "admin1",
      },
    });
  });

  it("attributes the post to the caller, not to a fixed id", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin2", role: "ADMIN" } });

    await createPost(validInput);

    expect(db.post.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorId: "admin2" }) })
    );
  });
});

describe("unpublishPost", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(unpublishPost({ postId: "p1" })).rejects.toThrow("Forbidden");
    expect(db.post.update).not.toHaveBeenCalled();
  });

  it("moves the post back to DRAFT, which removes it from the public site", async () => {
    await unpublishPost({ postId: "p1" });

    expect(db.post.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "DRAFT" },
    });
  });
});

describe("deletePost", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(deletePost({ postId: "p1" })).rejects.toThrow("Forbidden");
    expect(db.post.delete).not.toHaveBeenCalled();
  });

  it("deletes the post for admins", async () => {
    await expect(deletePost({ postId: "p1" })).resolves.toEqual({ ok: true });
    expect(db.post.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

describe("uploadGalleryImage", () => {
  function formDataWith(file: File | null, caption: string) {
    const fd = new FormData();
    if (file) fd.set("file", file);
    fd.set("caption", caption);
    return fd;
  }

  const pngFile = () => new File([new Uint8Array([1, 2, 3])], "floor.png", { type: "image/png" });

  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockedUpload.mockResolvedValue({ url: "/uploads/abc-floor.png" });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(uploadGalleryImage(formDataWith(pngFile(), "Floor session"))).rejects.toThrow(
      "Forbidden"
    );
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a submission with no file", async () => {
    await expect(uploadGalleryImage(formDataWith(null, "Floor session"))).rejects.toThrow();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a non-image file", async () => {
    // The gallery renders every row through next/image. A PDF would upload
    // fine and then break the page it appears on.
    const pdf = new File([new Uint8Array([1])], "notes.pdf", { type: "application/pdf" });

    await expect(uploadGalleryImage(formDataWith(pdf, "Notes"))).rejects.toThrow("image");
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit before uploading it", async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "huge.png", { type: "image/png" });

    await expect(uploadGalleryImage(formDataWith(big, "Huge"))).rejects.toThrow();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a caption that is too short, before uploading", async () => {
    await expect(uploadGalleryImage(formDataWith(pngFile(), "x"))).rejects.toThrow();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("stores the url the adapter returned, not the original filename", async () => {
    // The row must point at wherever the adapter actually put the file —
    // Cloudinary's secure_url in production, /uploads/... under the stub.
    // Writing file.name here would produce a broken image on both.
    await uploadGalleryImage(formDataWith(pngFile(), "Floor session"));

    expect(db.galleryImage.create).toHaveBeenCalledWith({
      data: { url: "/uploads/abc-floor.png", caption: "Floor session" },
    });
  });
});

describe("deleteGalleryImage", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(deleteGalleryImage({ imageId: "g1" })).rejects.toThrow("Forbidden");
    expect(db.galleryImage.delete).not.toHaveBeenCalled();
  });

  it("deletes the row for admins", async () => {
    await expect(deleteGalleryImage({ imageId: "g1" })).resolves.toEqual({ ok: true });
    expect(db.galleryImage.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
  });
});
