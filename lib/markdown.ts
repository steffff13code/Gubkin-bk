import { marked } from "marked";

marked.setOptions({ breaks: true });

export function renderMarkdown(source: string | null | undefined): string {
  if (!source) return "";
  return marked.parse(source, { async: false }) as string;
}
