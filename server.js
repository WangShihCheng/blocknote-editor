import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import TurndownService from "turndown";
import cors from "cors";
import path from "path";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

app.use(cors({ origin: "http://localhost:5173" }));

// 統一入口，未來加格式只要加 case
app.post("/api/convert", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "沒有收到檔案" });

  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    switch (ext) {
      case ".docx": {
        const { value: html } = await mammoth.convertToHtml({ buffer: req.file.buffer });
        const markdown = td.turndown(html);
        return res.json({ markdown });
      }
      // 未來擴充：
      // case ".xlsx": ...
      // case ".pdf":  ...
      default:
        return res.status(415).json({ error: `尚不支援 ${ext} 格式` });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "轉換失敗，請確認檔案格式正確" });
  }
});

app.listen(3001, () => console.log("✅ Convert server running on http://localhost:3001"));
