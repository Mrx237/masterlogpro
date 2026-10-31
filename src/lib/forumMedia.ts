export const FORUM_MEDIA_LIMIT = 50 * 1024 * 1024;
export type MediaKind = "image" | "video" | "audio";
const formats: Record<string, MediaKind> = {
  "image/jpeg": "image", "image/png": "image", "image/webp": "image", "image/gif": "image",
  "video/mp4": "video", "video/webm": "video", "video/quicktime": "video",
  "audio/webm": "audio", "audio/ogg": "audio", "audio/mp4": "audio", "audio/mpeg": "audio", "audio/wav": "audio",
};
export function validateForumMedia(file: Pick<File, "type" | "size">): MediaKind {
  const kind = formats[file.type.split(";")[0]];
  if (!kind) throw new Error("Format non pris en charge. Choisis une photo, une vidéo ou un fichier audio.");
  if (!file.size) throw new Error("Ce fichier est vide.");
  if (file.size > FORUM_MEDIA_LIMIT) throw new Error("Le fichier dépasse 50 Mo.");
  return kind;
}