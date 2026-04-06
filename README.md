# BlockNote Editor

一個針對**理工科學生**設計的全功能富文字編輯器，基於 BlockNote + React 19，支援數學公式、LaTeX 定理環境、多文件管理，資料完整儲存在本機瀏覽器（IndexedDB）。

---

## 技術堆疊

| 層次 | 套件 | 版本 |
|------|------|------|
| 框架 | React + TypeScript | 19 / 5.9 |
| 編輯器核心 | @blocknote/core + @blocknote/react | 0.47 |
| 編輯器 UI | @blocknote/mantine + @mantine/core | 0.47 / 8.3 |
| 數學渲染 | KaTeX | 0.16 |
| 本機資料庫 | Dexie.js (IndexedDB) + dexie-react-hooks | — |
| 建置工具 | Vite + ESLint | 7 |

---

## 功能清單

### 多文件管理
- 左側 Sidebar 顯示所有文件
- 新增、刪除、雙擊重新命名文件
- **拖曳排序**：握住拖柄（⠿）拖動文件改變順序
- 收合／展開 Sidebar（漢堡選單按鈕）
- **全文搜尋**：同時比對標題與正文內容

### 編輯器
- 基於 BlockNote 的 Notion 風格區塊編輯器
- **繁體中文 UI**：Slash 選單、工具列、說明文字全部中文
- 輸入 `/` 叫出 Slash 指令選單，插入各種區塊類型
- 支援所有標準富文字格式（粗體、斜體、底線、刪除線、行內程式碼、連結）
- 對齊方式、縮排、文字顏色
- 區塊類型：段落、標題（H1–H3）、無序/有序/待辦清單、程式碼區塊、引用、圖片、表格

### 數學功能（自訂區塊）
- **數學公式區塊**（`mathDisplay`）：KaTeX 即時渲染，可選編號，雙擊進入編輯，Ctrl+Enter 儲存，Esc 取消
- **定理環境區塊**（`theorem`）：支援 theorem / definition / lemma / corollary / remark / proof
- 自動編號：公式與定理環境各自跨全文計數
- Slash 選單有「📐 數學」與「📐 數學環境」分組

### 圖片上傳
- Base64 格式內嵌儲存（不需後端）
- 單張上限 5 MB，超過會警告

### 匯出與列印
- **匯出 Markdown**：點「⬇ 匯出 .md」下載 .md 檔案，自動帶日期後綴
- **列印 / 儲存 PDF**：Ctrl+P 或點「列印」按鈕，隱藏 UI chrome，僅印編輯區

### 其他 UI
- **深色 / 淺色模式**切換，完整覆蓋所有元件
- **字元數統計**（底部，不含空白），數字變更時有動畫
- **自動儲存**提示（每次內容變更後立即寫入 IndexedDB，顯示「✓ 已儲存」）
- **鍵盤快捷鍵面板**：按 `?` 或點右下角按鈕開啟

---

## 資料結構（IndexedDB — `blocknote-db`）

```typescript
interface Doc {
  id: string        // 主鍵（隨機字串）
  title: string
  content: any[]    // BlockNote blocks 陣列
  createdAt: Date
  updatedAt: Date
  order: number     // 拖曳排序順序
}
```

資料表：`documents`，索引：`id`（主鍵）、`updatedAt`、`order`

作用中文件的 id 另存於 `localStorage`（`blocknote-active`）。

---

## 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `/` | 開啟 Slash 指令選單 |
| `Ctrl+B / I / U` | 粗體 / 斜體 / 底線 |
| `Ctrl+K` | 插入連結 |
| `Ctrl+Z / Ctrl+Shift+Z` | 復原 / 重做 |
| `Tab / Shift+Tab` | 縮排 / 取消縮排 |
| `Ctrl+P` | 列印 / 儲存 PDF |
| `?` | 開啟快捷鍵面板 |
| `# ` / `## ` / `### ` | H1 / H2 / H3 標題 |
| `- ` / `1. ` / `[] ` | 無序 / 有序 / 待辦清單 |
| ` ``` + Enter` | 程式碼區塊 |
| `---` | 分隔線 |
| 數學區塊雙擊 | 進入編輯模式 |
| `Ctrl+Enter`（數學） | 儲存公式 |
| `Esc`（數學） | 取消編輯 |

---

## 開發指令

```bash
# 安裝依賴
npm install

# 啟動開發伺服器（預設 http://localhost:5173）
npm run dev

# 型別檢查 + 建置
npm run build

# 預覽建置結果
npm run preview
```

---

## 專案結構

```
src/
├── App.tsx          # 主元件：Sidebar、EditorWrapper、App（含所有功能）
├── db.ts            # Dexie IndexedDB 資料庫定義
├── math-blocks.tsx  # 自訂 BlockNote 區塊：mathDisplay、theorem
├── i18n/
│   └── zh-TW.ts    # BlockNote 繁體中文 UI 翻譯
├── index.css        # 全域樣式、動畫、深色模式、列印樣式
└── main.tsx         # React 進入點
```
