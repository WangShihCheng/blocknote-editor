import { useState, useRef } from "react";
import type { Doc } from "../types";
import { docPlainText } from "../utils/helpers";

export function Sidebar({ docs, activeId, open, search, isDark, onSelect, onDelete, onRename, onNew, onSearch, onReorder }: {
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
                <span style={{ color: muted, fontSize: "10px", opacity: 0.5, flexShrink: 0, letterSpacing: "-1px" }}>⠿</span>

                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: isActive ? accent : muted }}>
                  <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6L9 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

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

                <button className="delete-btn"
                  onClick={e => { e.stopPropagation(); onDelete(doc.id); }}
                  title="刪除文件"
                  style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: "11px", padding: "2px 3px", borderRadius: "3px", flexShrink: 0 }}>
                  ✕
                </button>
              </div>

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
