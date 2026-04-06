import { useEffect } from "react";
import { SHORTCUTS } from "../utils/constants";

export function ShortcutModal({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
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
