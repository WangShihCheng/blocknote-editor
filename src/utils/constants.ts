export const ACTIVE_KEY = "blocknote-active";
export const MAX_IMG_MB = 5;

export const DEFAULT_CONTENT: any[] = [
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

export const SHORTCUTS = [
  { key: "/",                desc: "開啟 Slash 指令選單" },
  { key: "Ctrl + B",        desc: "粗體" },
  { key: "Ctrl + I",        desc: "斜體" },
  { key: "Ctrl + U",        desc: "底線" },
  { key: "Ctrl + Z",        desc: "復原" },
  { key: "Ctrl + Shift + Z", desc: "重做" },
  { key: "Ctrl + K",        desc: "插入連結" },
  { key: "Tab",             desc: "區塊縮排" },
  { key: "Shift + Tab",     desc: "取消縮排" },
  { key: "Ctrl + P",        desc: "列印 / 儲存 PDF" },
  { key: "# + 空格",        desc: "H1 大標題" },
  { key: "## + 空格",       desc: "H2 中標題" },
  { key: "### + 空格",      desc: "H3 小標題" },
  { key: "- + 空格",        desc: "無序清單" },
  { key: "1. + 空格",       desc: "有序清單" },
  { key: "[] + 空格",       desc: "待辦清單" },
  { key: "``` + Enter",     desc: "程式碼區塊" },
  { key: "---",             desc: "分隔線" },
];
