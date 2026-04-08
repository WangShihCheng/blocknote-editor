import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { google } from 'googleapis';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── 1. 資料庫初始化 ───────────────────────────────────────────────
const db = new Database('thesis.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, title TEXT);
  CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY, docId TEXT, parentId TEXT, content TEXT,
    message TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (docId) REFERENCES documents(id)
  );
`);

// ── 2. OAuth 2.0 設定與憑證讀取 ───────────────────────────────────
const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';
let oAuth2Client;

try {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
  const keys = JSON.parse(content);

  // 💡 修正點：讀取 keys.installed 而不是 keys.web
  const { client_secret, client_id, redirect_uris } = keys.web;

  // 桌面應用程式有時候 redirect_uris 陣列會長得不太一樣，我們加個保險
  const redirectUri = (redirect_uris && redirect_uris.length > 0)
    ? redirect_uris[0]
    : 'http://localhost:3000/oauth2callback';

  oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH, 'utf-8');
    oAuth2Client.setCredentials(JSON.parse(token));
    console.log("[系統] 🟢 Google 授權已就緒，可隨時進行備份！");
  } else {
    console.log("\n⚠️ [系統] 尚未授權 Google Drive！");
    console.log("👉 請打開瀏覽器前往：http://localhost:3000/auth 進行第一次登入\n");
  }
} catch (err) {
  console.error("⚠️ [錯誤] 讀取 credentials.json 失敗，請確認檔案是否存在且格式正確。");
  console.error("詳細錯誤訊息:", err.message);
}


// ── 3. 授權與登入路由 (OAuth 流程) ────────────────────────────────
app.get('/auth', (req, res) => {
  if (!oAuth2Client) return res.send('錯誤：尚未載入 credentials.json');

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('授權失敗，沒有收到授權碼');

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

    console.log("[系統] 🎉 Token 取得並儲存成功！");
    res.send('<h1>🎉 授權成功！</h1><p>您已經可以關閉這個網頁，並回到程式開始備份檔案了！</p>');
  } catch (err) {
    console.error("取得 Token 失敗：", err);
    res.status(500).send('授權過程中發生錯誤');
  }
});


// ── 4. API 路由 (儲存版本與雲端備份) ─────────────────────────────
const MAX_VERSIONS = 30;

app.post('/api/snapshots', (req, res) => {
  const { id, docId, parentId, content, message, title } = req.body;
  try {
    const insertDoc = db.prepare('INSERT OR IGNORE INTO documents (id, title) VALUES (?, ?)');
    insertDoc.run(docId, title || "未命名文件");

    const insertSnapshot = db.prepare('INSERT INTO snapshots (id, docId, parentId, content, message) VALUES (?, ?, ?, ?, ?)');
    insertSnapshot.run(id, docId, parentId || null, JSON.stringify(content), message);

    const cleanupStmt = db.prepare(`DELETE FROM snapshots WHERE docId = ? AND id NOT IN (SELECT id FROM snapshots WHERE docId = ? ORDER BY createdAt DESC LIMIT ?)`);
    cleanupStmt.run(docId, docId, MAX_VERSIONS);

    res.status(201).json({ success: true, message: "版本儲存成功！" });
  } catch (error) {
    res.status(500).json({ error: "儲存失敗" });
  }
});

app.post('/api/backup/drive', async (req, res) => {
  if (!fs.existsSync(TOKEN_PATH)) {
    return res.status(401).json({ error: "尚未授權 Google Drive，請先在瀏覽器開啟 /auth" });
  }

  try {
    console.log("[系統] 開始備份資料庫到 Google Drive...");
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const fileMetadata = {
      name: `thesis_backup_${new Date().toISOString().slice(0, 10)}.db`,
    };
    const media = {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream('thesis.db')
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    console.log("[系統] 備份成功！檔案已存入您的雲端硬碟:", response.data.name);
    res.json({ success: true, message: `備份成功！檔案名稱：${response.data.name}` });

  } catch (error) {
    console.error("[系統] 備份失敗：", error);
    res.status(500).json({ error: "備份失敗", details: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 伺服器啟動於 http://localhost:${PORT}`);
});
