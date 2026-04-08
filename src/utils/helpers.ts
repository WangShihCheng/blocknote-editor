import { MAX_IMG_MB } from "./constants";
import type { Doc } from "../types";

export function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function filterSuggestionItems<T extends { title: string; aliases?: readonly string[] }>(
  items: T[], query: string
): T[] {
  return items.filter(({ title, aliases }) =>
    title.toLowerCase().includes(query.toLowerCase()) ||
    (aliases?.some(a => a.toLowerCase().includes(query.toLowerCase())) ?? false)
  );
}

export function docPlainText(doc: Doc): string {
  function extract(blocks: any[]): string {
    return blocks.map(b => {
      const t = Array.isArray(b.content) ? b.content.map((i: any) => i.text ?? "").join("") : "";
      return t + " " + (b.children ? extract(b.children) : "");
    }).join(" ");
  }
  return extract(doc.content).toLowerCase();
}

export async function uploadFile(file: File): Promise<string> {
  if (file.size > MAX_IMG_MB * 1024 * 1024) {
    alert(`圖片大小不能超過 ${MAX_IMG_MB} MB，請選擇較小的圖片。`);
    throw new Error("File exceeds size limit");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("讀取圖片失敗"));
    reader.readAsDataURL(file);
  });
}

export function countChars(blocks: any[]): number {
  let n = 0;
  for (const b of blocks) {
    if (Array.isArray(b.content))
      for (const i of b.content)
        if (i.type === "text") n += (i.text as string).replace(/\s+/g, "").length;
    if (b.children?.length) n += countChars(b.children);
  }
  return n;
}

export function blockToMd(b: any): string {
  const txt = (c: any[]) => c.map((i: any) => {
    if (i.type !== "text") return "";
    let t: string = i.text;
    if (i.styles?.bold)   t = `**${t}**`;
    if (i.styles?.italic) t = `*${t}*`;
    if (i.styles?.code)   t = `\`${t}\``;
    if (i.styles?.strike) t = `~~${t}~~`;
    return t;
  }).join("");
  const content  = Array.isArray(b.content) ? txt(b.content) : "";
  const children = b.children?.map((c: any) => "  " + blockToMd(c)).join("\n") ?? "";
  let line = "";
  switch (b.type) {
    case "heading":          line = `${"#".repeat(b.props?.level ?? 1)} ${content}`; break;
    case "bulletListItem":   line = `- ${content}`;                                  break;
    case "numberedListItem": line = `1. ${content}`;                                 break;
    case "checkListItem":    line = `- [${b.props?.checked ? "x" : " "}] ${content}`; break;
    case "codeBlock":        line = `\`\`\`\n${content}\n\`\`\``;                   break;
    case "image":            line = `![${b.props?.caption ?? ""}](${b.props?.url ?? ""})`; break;
    default:                 line = content;
  }
  return children ? `${line}\n${children}` : line;
}

export const toMarkdown = (blocks: any[]) => blocks.map(blockToMd).join("\n\n");
