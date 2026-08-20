/**
 * OSS Notes - Blog Server
 * 零依赖 Node.js 后端：内存存储 + 尽力持久化 + REST API
 *
 * 启动: node server.js
 * 端口: 8080
 * 数据: 启动时从 db/articles.json 加载到内存，写操作尝试持久化
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'db', 'articles.json');
const CONFIG_FILE = path.join(ROOT, 'db', 'config.json');

/* ============================================================
   配置
   ============================================================ */
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (e) {
    return { password: 'admin123' };
  }
}
const CONFIG = loadConfig();

/* ============================================================
   内存数据库（启动时从文件加载）
   ============================================================ */
let DB = { articles: [], nextId: 1 };

function initDB() {
  try {
    DB = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    console.log('  数据库已加载: ' + DB.articles.length + ' 篇文章');
  } catch (e) {
    DB = { articles: [], nextId: 1 };
    console.log('  数据库为空，从头开始');
  }
}

// 尽力持久化（沙箱内可能失败，不影响内存操作）
function persist() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
  } catch (e) {
    // 沙箱环境下静默失败，内存数据仍然有效
  }
}

/* ============================================================
   防重复提交：基于指纹 + 时间窗口（10秒）
   ============================================================ */
const DUP_WINDOW_MS = 10000;

function makeFingerprint(title, author, content) {
  const t = (title || '').trim();
  const a = (author || '').trim();
  const c = (content || '').trim().slice(0, 200);
  return (t + '|' + a + '|' + c).toLowerCase();
}

// 查找最近重复：当前文章列表中，如果存在指纹相同且在窗口内创建的文章，返回它
function findRecentDuplicate(title, author, content) {
  const fp = makeFingerprint(title, author, content);
  const now = Date.now();
  for (const article of DB.articles) {
    const afp = makeFingerprint(article.title, article.author, article.content);
    if (afp !== fp) continue;
    const t = (article.time || '00:00:00 UTC').replace(' UTC','');
    const created = new Date(article.date + 'T' + t + 'Z').getTime();
    if (now - created < DUP_WINDOW_MS) return article;
  }
  return null;
}

/* ============================================================
   CRUD 操作（全部在内存中）
   ============================================================ */
function getArticles() {
  return DB.articles
    .map(a => ({
      id: a.id, title: a.title, subscription: a.subscription,
      category: a.category, author: a.author, date: a.date,
      time: a.time, weekday: a.weekday, comments: a.comments,
      tags: a.tags, summary: a.summary
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getArticleById(id) {
  return DB.articles.find(a => a.id === parseInt(id)) || null;
}

function createArticle(data) {
  // 防重复提交：若存在窗口内相同指纹的文章，返回已存在的那条
  const dup = findRecentDuplicate(data.title, data.author, data.content);
  if (dup) {
    console.log('  防重复：检测到重复内容，返回已有 #'+dup.id);
    return { ...dup, _duplicate: true };
  }

  const now = new Date();
  const article = {
    id: DB.nextId++,
    title: data.title || '无标题',
    subscription: data.subscription || false,
    category: data.category || 'Development',
    author: data.author || 'anonymous',
    date: data.date || now.toISOString().slice(0, 10),
    time: data.time || now.toISOString().slice(11, 19) + ' UTC',
    weekday: data.weekday || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()],
    comments: 0,
    tags: data.tags || [],
    summary: data.summary || '',
    content: data.content || ''
  };
  DB.articles.push(article);
  persist();
  return article;
}

function updateArticle(id, data) {
  const idx = DB.articles.findIndex(a => a.id === parseInt(id));
  if (idx === -1) return null;
  DB.articles[idx] = { ...DB.articles[idx], ...data, id: parseInt(id) };
  persist();
  return DB.articles[idx];
}

function deleteArticle(id) {
  const idx = DB.articles.findIndex(a => a.id === parseInt(id));
  if (idx === -1) return false;
  DB.articles.splice(idx, 1);
  persist();
  return true;
}

function getTagIndex() {
  const tagMap = {};
  DB.articles.forEach(a => {
    (a.tags || []).forEach(t => {
      if (!tagMap[t]) tagMap[t] = { count: 0, articles: [] };
      tagMap[t].count++;
      tagMap[t].articles.push({
        id: a.id, title: a.title, category: a.category,
        author: a.author, date: a.date, time: a.time,
        weekday: a.weekday, comments: a.comments,
        subscription: a.subscription, summary: a.summary, tags: a.tags
      });
    });
  });
  return tagMap;
}

/* ============================================================
   HTTP 工具
   ============================================================ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8'
};

function sendJSON(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { resolve({}); }
    });
  });
}

function checkAuth(req) {
  const auth = req.headers['authorization'] || '';
  return auth === 'Bearer ' + CONFIG.password;
}

/* ============================================================
   API 路由
   ============================================================ */
async function handleAPI(req, res, pathname, method) {
  // 公开接口
  if (pathname === '/api/articles' && method === 'GET') {
    return sendJSON(res, 200, getArticles());
  }

  const articleMatch = pathname.match(/^\/api\/articles\/(\d+)$/);
  if (articleMatch && method === 'GET') {
    const article = getArticleById(articleMatch[1]);
    if (article) return sendJSON(res, 200, article);
    return sendJSON(res, 404, { error: '文章不存在' });
  }

  if (pathname === '/api/tags' && method === 'GET') {
    return sendJSON(res, 200, getTagIndex());
  }

  if (pathname === '/api/login' && method === 'POST') {
    const body = await readBody(req);
    if (body.password === CONFIG.password) {
      return sendJSON(res, 200, { token: CONFIG.password, ok: true });
    }
    return sendJSON(res, 401, { error: '密码错误' });
  }

  // 写操作（需要认证）
  if (pathname === '/api/articles' && method === 'POST') {
    if (!checkAuth(req)) return sendJSON(res, 401, { error: '未授权' });
    const body = await readBody(req);
    const article = createArticle(body);
    // 防重复命中：返回 200 而不是 201，附 _duplicate 标记
    const status = article._duplicate ? 200 : 201;
    return sendJSON(res, status, article);
  }

  if (articleMatch) {
    const id = articleMatch[1];
    if (method === 'PUT') {
      if (!checkAuth(req)) return sendJSON(res, 401, { error: '未授权' });
      const body = await readBody(req);
      const article = updateArticle(id, body);
      if (article) return sendJSON(res, 200, article);
      return sendJSON(res, 404, { error: '文章不存在' });
    }
    if (method === 'DELETE') {
      if (!checkAuth(req)) return sendJSON(res, 401, { error: '未授权' });
      if (deleteArticle(id)) return sendJSON(res, 200, { ok: true });
      return sendJSON(res, 404, { error: '文章不存在' });
    }
  }

  sendJSON(res, 404, { error: 'API 不存在' });
}

/* ============================================================
   静态文件服务
   ============================================================ */
function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ============================================================
   主服务器
   ============================================================ */
initDB();

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = urlObj.pathname;
    const method = req.method;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (pathname.startsWith('/api/')) {
      await handleAPI(req, res, pathname, method);
      return;
    }
    serveStatic(req, res, pathname);
  } catch (e) {
    console.error('异常:', e.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  OSS Notes 博客服务器已启动`);
  console.log(`  ────────────────────────────`);
  console.log(`  浏览: http://localhost:${PORT}`);
  console.log(`  写作: http://localhost:${PORT}/admin.html`);
  console.log(`  密码: ${CONFIG.password}`);
  console.log(`  ────────────────────────────\n`);
});
