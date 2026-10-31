import { describe, expect, it } from "vitest";
import { validateForumMedia, FORUM_MEDIA_LIMIT } from "@/lib/forumMedia";
describe("Forum media", () => {
  it("accepts photos", () => expect(validateForumMedia({ type: "image/jpeg", size: 100 })).toBe("image"));
  it("accepts videos", () => expect(validateForumMedia({ type: "video/mp4", size: 100 })).toBe("video"));
  it("accepts recorded voice", () => expect(validateForumMedia({ type: "audio/webm;codecs=opus", size: 100 })).toBe("audio"));
  it("rejects executable and SVG uploads", () => expect(() => validateForumMedia({ type: "image/svg+xml", size: 100 })).toThrow());
  it("rejects oversized media", () => expect(() => validateForumMedia({ type: "video/mp4", size: FORUM_MEDIA_LIMIT + 1 })).toThrow());
});