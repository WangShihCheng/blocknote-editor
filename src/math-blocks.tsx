import { createReactBlockSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useState, useRef, useEffect } from "react";
import katex from "katex";

// ════════════════════════════════════════════════════════════════
// Helpers: equation / environment numbering
// ════════════════════════════════════════════════════════════════

function getEqNumber(editor: any, blockId: string): number {
  let n = 0;
  function scan(blocks: any[]): boolean {
    for (const b of blocks) {
      if (b.type === "mathDisplay" && b.props?.numbered !== false) {
        n++;
        if (b.id === blockId) return true;
      }
      if (b.children?.length && scan(b.children)) return true;
    }
    return false;
  }
  scan(editor.document);
  return n;
}

function getEnvNumber(editor: any, blockId: string, envType: string): number {
  // proof / remark don't get numbered
  if (envType === "proof" || envType === "remark") return 0;
  let n = 0;
  function scan(blocks: any[]): boolean {
    for (const b of blocks) {
      if (b.type === "theorem" && b.props?.envType === envType) {
        n++;
        if (b.id === blockId) return true;
      }
      if (b.children?.length && scan(b.children)) return true;
    }
    return false;
  }
  scan(editor.document);
  return n;
}

// ════════════════════════════════════════════════════════════════
// MathDisplay block
// ════════════════════════════════════════════════════════════════

function renderKatex(formula: string): { html: string; error: string | null } {
  if (!formula.trim()) return { html: "", error: null };
  try {
    return {
      html: katex.renderToString(formula, {
        displayMode: true,
        throwOnError: true,
        output: "html",
      }),
      error: null,
    };
  } catch (e: any) {
    return { html: "", error: e.message ?? "公式錯誤" };
  }
}

function MathDisplayComp({ block, editor }: { block: any; editor: any }) {
  const isEmpty = !block.props.formula;
  const [editing, setEditing] = useState(isEmpty);
  const [draft,   setDraft]   = useState<string>(block.props.formula);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const eqNum = block.props.numbered ? getEqNumber(editor, block.id) : null;
  const preview = renderKatex(draft);
  const display = renderKatex(block.props.formula);

  function save() {
    editor.updateBlock(block, { props: { ...block.props, formula: draft.trim() } });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="math-block math-block--editing">
        {/* Live preview */}
        {preview.html && !preview.error && (
          <div className="math-live-preview"
            dangerouslySetInnerHTML={{ __html: preview.html }} />
        )}
        {preview.error && (
          <div className="math-error">⚠ {preview.error}</div>
        )}
        <textarea
          ref={textareaRef}
          className="math-input"
          value={draft}
          placeholder="輸入 LaTeX 公式，例如：\int_0^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
            if (e.key === "Escape") { setDraft(block.props.formula); setEditing(false); }
          }}
          spellCheck={false}
        />
        <div className="math-hint">
          <span>Ctrl+Enter 儲存 ・ Esc 取消</span>
          <label className="math-numbered-toggle">
            <input type="checkbox"
              checked={block.props.numbered}
              onChange={e => editor.updateBlock(block, { props: { ...block.props, numbered: e.target.checked } })}
            />
            &nbsp;顯示編號
          </label>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="math-block math-block--view" onDoubleClick={() => { setDraft(block.props.formula); setEditing(true); }}>
      {display.error ? (
        <div className="math-error">⚠ {display.error}
          <button className="math-edit-btn" onClick={() => setEditing(true)}>編輯</button>
        </div>
      ) : display.html ? (
        <div className="math-display-row">
          <div className="math-rendered" dangerouslySetInnerHTML={{ __html: display.html }} />
          {eqNum !== null && <span className="math-eqnum">({eqNum})</span>}
        </div>
      ) : (
        <div className="math-placeholder" onClick={() => setEditing(true)}>
          點擊輸入公式…
        </div>
      )}
      <div className="math-dblclick-hint">雙擊編輯</div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// Theorem / Definition / Lemma / Corollary / Remark / Proof
// ════════════════════════════════════════════════════════════════

export const ENV_META: Record<string, { zh: string; color: string }> = {
  theorem:    { zh: "定理",   color: "#6366f1" },
  definition: { zh: "定義",   color: "#059669" },
  lemma:      { zh: "引理",   color: "#d97706" },
  corollary:  { zh: "推論",   color: "#7c3aed" },
  remark:     { zh: "注記",   color: "#0891b2" },
  proof:      { zh: "證明",   color: "#6b7280" },
};

function TheoremComp({ block, editor, contentRef }: { block: any; editor: any; contentRef: any }) {
  const envType = block.props.envType || "theorem";
  const meta    = ENV_META[envType] ?? ENV_META.theorem;
  const needsNum = envType !== "proof" && envType !== "remark";
  const num      = needsNum ? getEnvNumber(editor, block.id, envType) : 0;

  return (
    <div
      className={`theorem-block theorem-block--${envType}`}
      data-env={envType}
      style={{ borderLeftColor: meta.color }}
    >
      <span className="theorem-label" style={{ color: meta.color }}>
        {meta.zh}
        {needsNum && num > 0 ? ` ${num}` : ""}
        {block.props.label ? ` (${block.props.label})` : ""}
        {"　"}
      </span>
      <span ref={contentRef} className="theorem-content" />
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// Custom schema
// ════════════════════════════════════════════════════════════════

let _mathSchema: ReturnType<typeof BlockNoteSchema.create> | null = null;
export function getMathSchema() {
  if (!_mathSchema) {
    const MathDisplayBlock = createReactBlockSpec(
      {
        type: "mathDisplay" as const,
        propSchema: {
          formula:  { default: "" as string },
          numbered: { default: true as boolean },
        },
        content: "none",
      },
      { render: (props: any) => <MathDisplayComp {...props} /> }
    );

    const TheoremBlock = createReactBlockSpec(
      {
        type: "theorem" as const,
        propSchema: {
          envType: { default: "theorem" as string },
          label:   { default: "" as string },
        },
        content: "inline",
      },
      { render: (props: any) => <TheoremComp {...props} /> }
    );

    _mathSchema = BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, mathDisplay: MathDisplayBlock(), theorem: TheoremBlock() } as any,
    });
  }
  return _mathSchema;
}

/** @deprecated 請改用 getMathSchema() */
export const mathSchema = null as unknown as ReturnType<typeof BlockNoteSchema.create>;

// ════════════════════════════════════════════════════════════════
// Slash menu item helpers
// ════════════════════════════════════════════════════════════════

function insertBlock(editor: any, blockDef: any) {
  try {
    const pos = editor.getTextCursorPosition();
    editor.insertBlocks([blockDef], pos.block, "after");
  } catch {
    // fallback: insert at document end
    const last = editor.document[editor.document.length - 1];
    if (last) editor.insertBlocks([blockDef], last, "after");
  }
}

export function mathSlashItems(editor: any) {
  const mathIcon = <span style={{ fontWeight: 900, fontSize: "14px" }}>∑</span>;

  const theoremItems = Object.entries(ENV_META).map(([envType, meta]) => ({
    title: `${meta.zh}（${envType}）`,
    onItemClick: () => insertBlock(editor, {
      type: "theorem",
      props: { envType, label: "" },
      content: [{ type: "text", text: "", styles: {} }],
    }),
    aliases: [envType, meta.zh],
    group: "📐 數學環境",
    icon: <span style={{ color: meta.color, fontWeight: 700, fontSize: "12px" }}>{meta.zh[0]}</span>,
  }));

  return [
    {
      title: "數學公式（Display）",
      onItemClick: () => insertBlock(editor, {
        type: "mathDisplay",
        props: { formula: "", numbered: true },
      }),
      aliases: ["math", "equation", "公式", "latex", "TeX"],
      group: "📐 數學",
      icon: mathIcon,
      hint: "插入帶編號的數學公式區塊",
    },
    {
      title: "數學公式（不帶編號）",
      onItemClick: () => insertBlock(editor, {
        type: "mathDisplay",
        props: { formula: "", numbered: false },
      }),
      aliases: ["math*", "displaymath", "公式無編號"],
      group: "📐 數學",
      icon: mathIcon,
    },
    ...theoremItems,
  ];
}
