import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";

// filterSuggestionItems 未從 @blocknote/core 主 entry 匯出，直接實作
function filterSuggestionItems<T extends { title: string; aliases?: readonly string[] }>(
  items: T[], query: string
): T[] {
  return items.filter(({ title, aliases }) =>
    title.toLowerCase().includes(query.toLowerCase()) ||
    (aliases?.some(a => a.toLowerCase().includes(query.toLowerCase())) ?? false)
  );
}
import { useState, useEffect, useCallback, useRef, memo, Component } from "react";
import type { ReactNode } from "react";

// ── Error Boundary ───────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.error("編輯器發生非預期錯誤:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "24px", textAlign: "center", color: "#6b6b8a" }}>
          <p>⚠️ 編輯器發生異常，請嘗試重新整理頁面以恢復正常。</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: "10px", padding: "6px 12px" }}>重新整理</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import "katex/dist/katex.min.css";
import { getMathSchema, mathSlashItems } from "./math-blocks";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { zhTW } from "./i18n/zh-TW";

// ════════════════════════════════════════════════════════════════
// Types & Storage
// ════════════════════════════════════════════════════════════════
interface Doc { id: string; title: string; content: any[]; order: number; createdAt: Date; updatedAt: Date; }

const ACTIVE_KEY = "blocknote-active";
const MAX_IMG_MB = 5;

function genId() { return Math.random().toString(36).slice(2, 10); }

const DEFAULT_CONTENT = [
  { type: "heading", content: [{ type: "text", text: "歡迎使用 BlockNote 編輯器 👋", styles: {} }] },
  { type: "paragraph", content: [{ type: "text", text: "這是一個針對理工科學生設計的輕量 Markdown 編輯器，支援數學公式、定理環境與圖片上傳。", styles: {} }] },

  { type: "heading", content: [{ type: "text", text: "數學公式示範", styles: {} }], props: { level: 2 } },
  { type: "paragraph", content: [{ type: "text", text: "輸入 / 後選擇「數學公式」插入帶編號公式，例如 Euler 恆等式：", styles: {} }] },
  { type: "mathDisplay", props: { formula: "e^{i\\pi} + 1 = 0", numbered: true } },
  { type: "paragraph", content: [{ type: "text", text: "正態分佈密度函數：", styles: {} }] },
  { type: "mathDisplay", props: { formula: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}", numbered: true } },

  { type: "heading", content: [{ type: "text", text: "定理環境示範", styles: {} }], props: { level: 2 } },
  { type: "paragraph", content: [{ type: "text", text: "輸入 / 後可選擇定理、定義、引理、推論、注記、證明：", styles: {} }] },
  { type: "theorem", props: { envType: "definition", label: "極限" }, content: [{ type: "text", text: "若對任意 ε > 0，存在 δ > 0 使得當 0 < |x − a| < δ 時有 |f(x) − L| < ε，則稱 L 為 f(x) 在 x→a 時的極限。", styles: {} }] },
  { type: "theorem", props: { envType: "theorem", label: "" }, content: [{ type: "text", text: "設 f 在 [a,b] 上連續且在 (a,b) 上可微，則存在 c ∈ (a,b) 使得 f′(c) = (f(b)−f(a))/(b−a)。", styles: {} }] },
  { type: "theorem", props: { envType: "proof", label: "" }, content: [{ type: "text", text: "由 Rolle 定理直接推導得到。∎", styles: {} }] },

  { type: "heading", content: [{ type: "text", text: "基本操作提示", styles: {} }], props: { level: 2 } },
  { type: "bulletListItem", content: [{ type: "text", text: "輸入 / 叫出指令選單，數學區塊在「📐 數學」與「📐 數學環境」分組下", styles: {} }] },
  { type: "bulletListItem", content: [{ type: "text", text: "數學公式區塊：雙擊進入編輯，Ctrl+Enter 儲存，Esc 取消", styles: {} }] },
  { type: "bulletListItem", content: [{ type: "text", text: "圖片以 Base64 儲存在本機，單張上限 5 MB", styles: {} }] },
  { type: "bulletListItem", content: [{ type: "text", text: "右下角 ? 可查看所有鍵盤快捷鍵", styles: {} }] },
  { type: "paragraph", content: [{ type: "text", text: "💡 這份說明可以直接刪除，開始寫你的內容！", styles: { italic: true } }] },
];

function docPlainText(doc: Doc): string {
  function extract(blocks: any[]): string {
    return blocks.map(b => {
      const t = Array.isArray(b.content) ? b.content.map((i: any) => i.text ?? "").join("") : "";
      return t + " " + (b.children ? extract(b.children) : "");
    }).join(" ");
  }
  return extract(doc.content).toLowerCase();
}

// ════════════════════════════════════════════════════════════════
// Image upload — Base64 inline, 5 MB limit
// ════════════════════════════════════════════════════════════════
async function uploadFile(file: File): Promise<string> {
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

// ════════════════════════════════════════════════════════════════
// MagicUI ShimmerButton
// ════════════════════════════════════════════════════════════════
function ShimmerButton({ children, onClick, title }: {
  children: React.ReactNode; onClick?: () => void; title?: string;
}) {
  return (
    <button className="shimmer-btn" onClick={onClick} title={title}>
      <div className="spark"><div className="spark-inner"><div className="spark-rotate" /></div></div>
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
      <div className="shimmer-highlight" />
      <div className="shimmer-bg" />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// MagicUI NumberTicker
// ════════════════════════════════════════════════════════════════
function NumberTicker({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [animKey, setAnimKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setDisplay(value);
      setAnimKey(k => k + 1);
    }
  }, [value]);
  return <span key={animKey} className="number-ticker">{display.toLocaleString()}</span>;
}

// ════════════════════════════════════════════════════════════════
// Utilities
// ════════════════════════════════════════════════════════════════
function countChars(blocks: any[]): number {
  let n = 0;
  for (const b of blocks) {
    if (Array.isArray(b.content))
      for (const i of b.content)
        if (i.type === "text") n += (i.text as string).replace(/\s+/g, "").length;
    if (b.children?.length) n += countChars(b.children);
  }
  return n;
}

function blockToMd(b: any): string {
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
const toMarkdown = (blocks: any[]) => blocks.map(blockToMd).join("\n\n");

// ════════════════════════════════════════════════════════════════
// Keyboard Shortcut Modal
// ════════════════════════════════════════════════════════════════
const SHORTCUTS = [
  { key: "/",              desc: "開啟 Slash 指令選單" },
  { key: "Ctrl + B",       desc: "粗體" },
  { key: "Ctrl + I",       desc: "斜體" },
  { key: "Ctrl + U",       desc: "底線" },
  { key: "Ctrl + Z",       desc: "復原" },
  { key: "Ctrl + Shift + Z", desc: "重做" },
  { key: "Ctrl + K",       desc: "插入連結" },
  { key: "Tab",            desc: "區塊縮排" },
  { key: "Shift + Tab",    desc: "取消縮排" },
  { key: "Ctrl + P",       desc: "列印 / 儲存 PDF" },
  { key: "# + 空格",       desc: "H1 大標題" },
  { key: "## + 空格",      desc: "H2 中標題" },
  { key: "### + 空格",     desc: "H3 小標題" },
  { key: "- + 空格",       desc: "無序清單" },
  { key: "1. + 空格",      desc: "有序清單" },
  { key: "[] + 空格",      desc: "待辦清單" },
  { key: "``` + Enter",    desc: "程式碼區塊" },
  { key: "---",            desc: "分隔線" },
];

function ShortcutModal({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const bg      = isDark ? "#1e1e2e" : "#fff";
  const overlay = "rgba(0,0,0,0.45)";
  const text    = isDark ? "#e0e0e0" : "#2d3748";
  const muted   = isDark ? "#888" : "#9ca3af";
  const border  = isDark ? "#2a2a40" : "#e4e7ec";
  const keyBg   = isDark ? "#13162a" : "#f1f5f9";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: overlay,
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: bg, borderRadius: "14px", width: "480px", maxWidth: "94vw",
        maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        border: `1px solid ${border}`,
      }}>
        {/* Modal header */}
        <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: text }}>⌨️ 鍵盤快捷鍵</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: "18px", lineHeight: 1, padding: "2px 4px" }}>✕</button>
        </div>
        {/* Shortcut list */}
        <div style={{ overflowY: "auto", padding: "10px 20px 16px" }}>
          {SHORTCUTS.map(s => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${border}` }}>
              <span style={{ fontSize: "0.83rem", color: text }}>{s.desc}</span>
              <kbd style={{
                background: keyBg, border: `1px solid ${border}`,
                borderRadius: "5px", padding: "2px 8px",
                fontSize: "0.75rem", color: text, fontFamily: "monospace",
                whiteSpace: "nowrap", boxShadow: `0 1px 0 ${border}`,
              }}>{s.key}</kbd>
            </div>
          ))}
          <p style={{ fontSize: "0.72rem", color: muted, marginTop: "10px", textAlign: "center" }}>按 Esc 關閉</p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// EditorWrapper — re-mounts on doc switch, supports image upload
// ════════════════════════════════════════════════════════════════
const EditorWrapper = memo(function EditorWrapper({
  initialContent, isDark, onContentChange, onCharCount,
}: {
  initialContent: any[]; isDark: boolean;
  onContentChange: (c: any[]) => void; onCharCount: (n: number) => void;
}) {
  const editor = useCreateBlockNote({ schema: getMathSchema(), initialContent, uploadFile, dictionary: zhTW } as any);
  useEffect(() => {
    onCharCount(countChars(editor.document as any));
    return editor.onChange(() => {
      onContentChange(editor.document as any);
      onCharCount(countChars(editor.document as any));
    });
  }, [editor]);
  return (
    <BlockNoteView editor={editor} theme={isDark ? "dark" : "light"} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...(getDefaultReactSlashMenuItems(editor) as any[]),
              ...mathSlashItems(editor),
            ],
            query
          ) as any
        }
      />
    </BlockNoteView>
  );
});

// ════════════════════════════════════════════════════════════════
// Sidebar with drag-and-drop sorting
// ════════════════════════════════════════════════════════════════
function Sidebar({ docs, activeId, open, search, isDark, onSelect, onDelete, onRename, onNew, onSearch, onReorder }: {
  docs: Doc[]; activeId: string; open: boolean; search: string; isDark: boolean;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void; onNew: () => void;
  onSearch: (q: string) => void; onReorder: (docs: Doc[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal,   setEditVal]   = useState("");
  const [dragId,    setDragId]    = useState<string | null>(null);
  const [dropIdx,   setDropIdx]   = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bg       = isDark ? "#13162a" : "#f8f9fa";
  const border   = isDark ? "#2a2a40" : "#e4e7ec";
  const text     = isDark ? "#d0d0e8" : "#2d3748";
  const muted    = isDark ? "#6b6b8a" : "#9ca3af";
  const activeBg = isDark ? "#1e2240" : "#eef2ff";
  const hoverBg  = isDark ? "#1a1d35" : "#f1f5f9";
  const accent   = "#6366f1";

  // Filter only for display; drag-and-drop operates on full docs list
  const filtered = docs.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) || docPlainText(d).includes(q);
  });

  function startEdit(doc: Doc, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditVal(doc.title);
    setTimeout(() => inputRef.current?.select(), 30);
  }
  function commitEdit() {
    if (editingId && editVal.trim()) onRename(editingId, editVal.trim());
    setEditingId(null);
  }

  // ── Drag handlers ───────────────────────────────────────────────
  function handleDragStart(id: string) { setDragId(id); }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setDropIdx(e.clientY < rect.top + rect.height / 2 ? idx : idx + 1);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (dragId === null || dropIdx === null) return;
    const fromIdx = docs.findIndex(d => d.id === dragId);
    if (fromIdx === -1) return;
    const updated = [...docs];
    const [moved] = updated.splice(fromIdx, 1);
    const insertAt = dropIdx > fromIdx ? dropIdx - 1 : dropIdx;
    updated.splice(insertAt, 0, moved);
    onReorder(updated);
    setDragId(null);
    setDropIdx(null);
  }

  function handleDragEnd() { setDragId(null); setDropIdx(null); }

  // ── Collapsed view ──────────────────────────────────────────────
  if (!open) {
    return (
      <div className="app-sidebar" style={{
        width: "52px", flexShrink: 0, background: bg, borderRight: `1px solid ${border}`,
        display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "14px", gap: "10px",
      }}>
        <button onClick={onNew} title="新增文件"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", padding: "5px", borderRadius: "6px", color: muted }}>
          ＋
        </button>
        <div style={{ width: "28px", height: "1px", background: border }} />
        {docs.map(d => (
          <button key={d.id} onClick={() => onSelect(d.id)} title={d.title}
            style={{
              width: "9px", height: "9px", borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
              background: d.id === activeId ? accent : (isDark ? "#3a3a5a" : "#cbd5e1"),
              boxShadow: d.id === activeId ? `0 0 0 2px ${bg}, 0 0 0 3px ${accent}` : "none",
              transition: "all 0.2s",
            }} />
        ))}
      </div>
    );
  }

  // ── Expanded view ───────────────────────────────────────────────
  return (
    <div className="app-sidebar" style={{
      width: "228px", flexShrink: 0, background: bg, borderRight: `1px solid ${border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>文件</span>
        <button onClick={onNew} title="新增文件"
          style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: "18px", lineHeight: 1, padding: "1px 3px", borderRadius: "4px" }}>
          ＋
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: isDark ? "#0c0f1e" : "#fff", borderRadius: "7px", padding: "5px 9px", border: `1px solid ${border}` }}>
          <span style={{ color: muted, fontSize: "11px", flexShrink: 0 }}>🔍</span>
          <input type="text" placeholder="搜尋文件..." value={search} onChange={e => onSearch(e.target.value)}
            style={{ background: "none", border: "none", outline: "none", color: text, fontSize: "0.78rem", width: "100%" }} />
          {search && <button onClick={() => onSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 0, fontSize: "11px", flexShrink: 0 }}>✕</button>}
        </div>
      </div>

      {/* File list with drag-and-drop */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}>
        {filtered.length === 0 && (
          <p style={{ color: muted, fontSize: "0.78rem", textAlign: "center", padding: "18px 12px" }}>
            {search ? "找不到文件" : "沒有文件"}
          </p>
        )}

        {filtered.map((doc, idx) => {
          const isActive  = doc.id === activeId;
          const isDragged = doc.id === dragId;
          const realIdx   = docs.findIndex(d => d.id === doc.id);

          return (
            <div key={doc.id}>
              {/* Drop indicator line — above this item */}
              {dropIdx === realIdx && dragId !== null && (
                <div style={{ height: "2px", background: accent, margin: "1px 10px", borderRadius: "1px" }} />
              )}

              <div className="file-item"
                draggable
                onDragStart={() => handleDragStart(doc.id)}
                onDragOver={e => handleDragOver(e, realIdx)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelect(doc.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "5px 12px 5px 10px",
                  background: isActive ? activeBg : "transparent",
                  cursor: "grab", userSelect: "none",
                  borderLeft: isActive ? `2px solid ${accent}` : "2px solid transparent",
                  opacity: isDragged ? 0.4 : 1,
                  transition: "background 0.12s, opacity 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = hoverBg; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                {/* Drag handle dots */}
                <span style={{ color: muted, fontSize: "10px", opacity: 0.5, flexShrink: 0, letterSpacing: "-1px" }}>⠿</span>

                {/* File icon */}
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: isActive ? accent : muted }}>
                  <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6L9 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                {/* Title / rename input */}
                {editingId === doc.id ? (
                  <input ref={inputRef} value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, background: isDark ? "#0c0f1e" : "#fff", border: `1px solid ${accent}`, borderRadius: "4px", color: text, fontSize: "0.8rem", padding: "1px 5px", outline: "none" }} />
                ) : (
                  <span onDoubleClick={e => startEdit(doc, e)}
                    title={`${doc.title}（雙擊重新命名）`}
                    style={{ flex: 1, fontSize: "0.8rem", color: isActive ? accent : text, fontWeight: isActive ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.title}
                  </span>
                )}

                {/* Delete button */}
                <button className="delete-btn"
                  onClick={e => { e.stopPropagation(); onDelete(doc.id); }}
                  title="刪除文件"
                  style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: "11px", padding: "2px 3px", borderRadius: "3px", flexShrink: 0 }}>
                  ✕
                </button>
              </div>

              {/* Drop indicator line — after last item */}
              {idx === filtered.length - 1 && dropIdx === realIdx + 1 && dragId !== null && (
                <div style={{ height: "2px", background: accent, margin: "1px 10px", borderRadius: "1px" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Main App
// ════════════════════════════════════════════════════════════════
export default function App() {
  const docs = useLiveQuery(
    () => db.documents.orderBy('order').toArray(),
    [],
    []
  ) as Doc[];
  const [activeId,      setActiveId]      = useState(() => localStorage.getItem(ACTIVE_KEY) ?? "");
  const [isDark,        setIsDark]        = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [saved,         setSaved]         = useState(false);
  const [wordCount,     setWordCount]     = useState(0);
  const [search,        setSearch]        = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);

  const activeDoc = docs.find(d => d.id === activeId) ?? docs[0];

  // ── 初始化：DB 為空時建立預設文件 ───────────────────────────────
  useEffect(() => {
    db.documents.count().then(count => {
      if (count === 0) {
        const id = genId();
        db.documents.add({
          id, title: "我的第一份文件",
          content: DEFAULT_CONTENT,
          createdAt: new Date(), updatedAt: new Date(), order: 0,
        }).then(() => { setActiveId(id); localStorage.setItem(ACTIVE_KEY, id); });
      }
    });
  }, []);

  // ── 當 docs 載入後 activeId 不合法時，自動選第一份 ──────────────
  useEffect(() => {
    if (docs.length > 0 && !docs.find(d => d.id === activeId)) {
      setActiveId(docs[0].id);
      localStorage.setItem(ACTIVE_KEY, docs[0].id);
    }
  }, [docs, activeId]);

  // ── Doc operations ──────────────────────────────────────────────
  const handleContentChange = useCallback((content: any[]) => {
    db.documents.update(activeId, { content, updatedAt: new Date() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [activeId]);

  const switchDoc = useCallback((id: string) => { setActiveId(id); localStorage.setItem(ACTIVE_KEY, id); setSearch(""); }, []);

  const reorderDocs = useCallback((newDocs: Doc[]) => {
    db.documents.bulkPut(newDocs.map((d, i) => ({ ...d, order: i })));
  }, []);

  const newDoc = useCallback(() => {
    const id = genId();
    db.documents.add({
      id, title: "新文件",
      content: [{ type: "paragraph", content: [{ type: "text", text: "", styles: {} }] }],
      createdAt: new Date(), updatedAt: new Date(), order: docs.length,
    }).then(() => { setActiveId(id); localStorage.setItem(ACTIVE_KEY, id); });
  }, [docs.length]);

  const deleteDoc = useCallback((id: string) => {
    if (!window.confirm("確定要刪除這份文件嗎？")) return;
    db.documents.delete(id).then(async () => {
      const remaining = await db.documents.orderBy('order').toArray();
      if (remaining.length === 0) {
        const fid = genId();
        await db.documents.add({
          id: fid, title: "我的文件", content: DEFAULT_CONTENT,
          createdAt: new Date(), updatedAt: new Date(), order: 0,
        });
        setActiveId(fid); localStorage.setItem(ACTIVE_KEY, fid);
      } else if (id === activeId) {
        setActiveId(remaining[0].id); localStorage.setItem(ACTIVE_KEY, remaining[0].id);
      }
    });
  }, [activeId]);

  const renameDoc = useCallback((id: string, title: string) => {
    db.documents.update(id, { title });
  }, []);

  // ── Export / Print ──────────────────────────────────────────────
  const exportMd = useCallback(() => {
    const md   = toMarkdown(activeDoc?.content ?? []);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), {
      href: url, download: `${activeDoc?.title ?? "note"}-${new Date().toISOString().slice(0, 10)}.md`,
    });
    a.click(); URL.revokeObjectURL(url);
  }, [activeDoc]);

  const printDoc = useCallback(() => { window.print(); }, []);

  // ── Keyboard shortcut: Ctrl+P → print, ? → shortcuts ──────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "p") { e.preventDefault(); window.print(); }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        setShowShortcuts(s => !s);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Theme ───────────────────────────────────────────────────────
  const headerBg = isDark ? "#13162a" : "#ffffff";
  const bodyBg   = isDark ? "#0f1122" : "#f0f4f8";
  const editorBg = isDark ? "#1e1e2e" : "#ffffff";
  const textClr  = isDark ? "#e0e0e0" : "#333";
  const border   = isDark ? "#2a2a40" : "#e4e7ec";
  const muted    = isDark ? "#6b6b8a" : "#9ca3af";

  return (
    <div data-theme={isDark ? "dark" : "light"} style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>

      {/* Shortcut Modal */}
      {showShortcuts && <ShortcutModal onClose={() => setShowShortcuts(false)} isDark={isDark} />}

      {/* Header */}
      <div className="app-header" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: "52px", flexShrink: 0,
        background: headerBg, borderBottom: `1px solid ${border}`,
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)", zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? "收合側邊欄" : "展開側邊欄"}
            style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: "5px 6px", borderRadius: "6px", lineHeight: 1, display: "flex", alignItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4"    width="14" height="1.8" rx="0.9" fill="currentColor"/>
              <rect x="2" y="8.1"  width="14" height="1.8" rx="0.9" fill="currentColor"/>
              <rect x="2" y="12.2" width="14" height="1.8" rx="0.9" fill="currentColor"/>
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: textClr }}>📝 BlockNote Editor</h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: saved ? "#22c55e" : muted, transition: "color 0.3s", minWidth: "50px", textAlign: "right" }}>
            {saved ? "✓ 已儲存" : "自動儲存"}
          </span>

          {/* Print button */}
          <button onClick={printDoc} title="列印 / 儲存為 PDF（Ctrl+P）"
            style={{ background: "none", border: `1px solid ${border}`, cursor: "pointer", color: textClr, padding: "5px 12px", borderRadius: "8px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            列印
          </button>

          <ShimmerButton onClick={exportMd} title="匯出為 Markdown 檔案">⬇ 匯出 .md</ShimmerButton>

          <button onClick={() => setIsDark(d => !d)}
            style={{ padding: "5px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: isDark ? "#e0e0e0" : "#1e1e2e", color: isDark ? "#1e1e2e" : "#e0e0e0" }}>
            {isDark ? "☀️ 淺色" : "🌙 深色"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar docs={docs} activeId={activeId} open={sidebarOpen} search={search} isDark={isDark}
          onSelect={switchDoc} onDelete={deleteDoc} onRename={renameDoc}
          onNew={newDoc} onSearch={setSearch} onReorder={reorderDocs} />

        <div style={{ flex: 1, overflowY: "auto", background: bodyBg, paddingBottom: "44px" }}>
          <div className="editor-area" style={{ maxWidth: "860px", margin: "28px auto", background: editorBg, borderRadius: "12px", boxShadow: "0 2px 20px rgba(0,0,0,0.09)", padding: "24px", minHeight: "72vh" }}>
            {activeDoc && (
              <ErrorBoundary>
                <EditorWrapper key={activeId} initialContent={activeDoc.content}
                  isDark={isDark} onContentChange={handleContentChange} onCharCount={setWordCount} />
              </ErrorBoundary>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="app-footer" style={{ background: headerBg, borderTop: `1px solid ${border}`, padding: "5px 22px", display: "flex", justifyContent: "flex-end", alignItems: "center", fontSize: "0.78rem", color: muted, flexShrink: 0 }}>
        <span>字元數：<strong style={{ color: textClr, marginLeft: "4px" }}><NumberTicker value={wordCount} /></strong></span>
      </div>

      {/* Shortcut panel button — fixed bottom-right */}
      <button
        onClick={() => setShowShortcuts(s => !s)}
        title="鍵盤快捷鍵（?）"
        style={{
          position: "fixed", bottom: "48px", right: "20px",
          width: "34px", height: "34px", borderRadius: "50%",
          background: isDark ? "#1e2240" : "#e8eaf6",
          border: `1px solid ${isDark ? "#3a3a6a" : "#c5cae9"}`,
          color: isDark ? "#9fa8da" : "#5c6bc0",
          cursor: "pointer", fontSize: "15px", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transition: "transform 0.2s, box-shadow 0.2s",
          zIndex: 200,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >?</button>
    </div>
  );
}
