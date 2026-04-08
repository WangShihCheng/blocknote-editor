import { useState, useEffect, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { Doc } from "./types";
import { ACTIVE_KEY, DEFAULT_CONTENT } from "./utils/constants";
import { genId, toMarkdown } from "./utils/helpers";
import { getMathSchema } from "./math-blocks";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { EditorWrapper } from "./components/EditorWrapper";
import { Sidebar } from "./components/Sidebar";
import { ShortcutModal } from "./components/ShortcutModal";
import { NumberTicker } from "./components/ui/NumberTicker";

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

  const switchDoc = useCallback((id: string) => {
    setActiveId(id); localStorage.setItem(ACTIVE_KEY, id); setSearch("");
  }, []);

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

  // ── Import Markdown ──────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportMd = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const title = file.name.replace(/\.md$/i, "");

      const { BlockNoteEditor } = await import("@blocknote/core");
      const tempEditor = BlockNoteEditor.create({ schema: getMathSchema() as any });
      const blocks = await tempEditor.tryParseMarkdownToBlocks(text);

      const id = genId();
      await db.documents.add({
        id,
        title: title || "匯入的文件",
        content: blocks,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: docs.length,
      });

      setActiveId(id);
      localStorage.setItem(ACTIVE_KEY, id);
    } catch (error) {
      console.error("匯入 Markdown 失敗:", error);
      alert("匯入失敗，請確認檔案格式是否正確。");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [docs.length]);

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

      {showShortcuts && <ShortcutModal onClose={() => setShowShortcuts(false)} isDark={isDark} />}

      {/* Header */}
      <div className="app-header" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: "56px", flexShrink: 0,
        background: isDark ? "rgba(19,22,42,0.85)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        zIndex: 100,
      }}>
        {/* Left: sidebar toggle + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? "收合側邊欄" : "展開側邊欄"}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: muted, padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center", transition: "background 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "#2a2a40" : "#f1f5f9"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4"    width="14" height="1.8" rx="0.9" fill="currentColor"/>
              <rect x="2" y="8.1"  width="14" height="1.8" rx="0.9" fill="currentColor"/>
              <rect x="2" y="12.2" width="14" height="1.8" rx="0.9" fill="currentColor"/>
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: textClr, letterSpacing: "0.3px" }}>BlockNote</h1>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          <span style={{ fontSize: "0.72rem", color: "#22c55e", marginRight: "10px", opacity: saved ? 1 : 0, transition: "opacity 0.3s" }}>
            ✓ 已儲存
          </span>

          <input type="file" accept=".md" ref={fileInputRef} onChange={handleImportMd} style={{ display: "none" }} />

          {/* Import */}
          <button onClick={() => fileInputRef.current?.click()} title="匯入 Markdown"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: muted, padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "#2a2a40" : "#f1f5f9"; e.currentTarget.style.color = textClr; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = muted; }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>

          {/* Export */}
          <button onClick={exportMd} title="匯出 Markdown"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: muted, padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "#2a2a40" : "#f1f5f9"; e.currentTarget.style.color = textClr; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = muted; }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>

          {/* Print */}
          <button onClick={printDoc} title="列印 / PDF（Ctrl+P）"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: muted, padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "#2a2a40" : "#f1f5f9"; e.currentTarget.style.color = textClr; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = muted; }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
          </button>

          {/* Divider */}
          <div style={{ width: "1px", height: "20px", background: border, margin: "0 6px" }} />

          {/* Dark mode */}
          <button onClick={() => setIsDark(d => !d)} title={isDark ? "切換淺色模式" : "切換深色模式"}
            style={{ background: isDark ? "#2a2a40" : "#f1f5f9", border: "none", cursor: "pointer", color: textClr, padding: "7px 10px", borderRadius: "8px", fontSize: "15px", display: "flex", alignItems: "center", transition: "background 0.15s" }}>
            {isDark ? "☀️" : "🌙"}
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
