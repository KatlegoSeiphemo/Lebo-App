import { Platform } from "react-native";
import { getToken } from "@/src/lib/api";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export type Attachment = {
  path: string;
  name: string;
  type: string;
  kind: "image" | "audio" | "document" | string;
  size: number;
};

export async function uploadFile(file: { uri: string; name: string; type: string }): Promise<Attachment> {
  const token = await getToken();
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    form.append("file", blob, file.name);
  } else {
    form.append("file", { uri: file.uri, name: file.name, type: file.type } as any);
  }
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    let msg = "Upload failed";
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function fileUrl(path: string, token: string | null) {
  return `${BASE}/files/${path}?token=${encodeURIComponent(token || "")}`;
}
