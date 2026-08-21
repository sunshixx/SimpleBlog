/**
 * OSS Notes - Blog Server
 * 零依赖 Node.js 后端：文件系统数据层 + 图片库 + REST API
 *
 * 启动: node server.js
 * 端口: 8080
 * 数据:
 *   db/articles/{id}.md   每篇文章一个文件（带 YAML frontmatter）
 *   db/config.json        密码等配置
 *   picture/              图片库（被 markdown 自动引用）
 *
 * 文章 .md 文件格式:
 *   ---
 *   id: 1
 *   title: 标题
 *   subscription: false
 *   category: Kernel
 *   author: admin
 *   date: 2026-08-21
 *   time: 10:00:00 UTC
 *   weekday: Thu
 *   comments: 0
 *   tags: [a, b, c]
 *   summary: 摘要
 *   ---
 *
 *   正文（Markdown）...
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8080;
const ROOT = __dirname;
const ARTICLES_DIR = path.join(ROOT, 'db', 'articles');
const COMMENTS_DIR = path.join(ROOT, 'db', 'comments');
const CONFIG_FILE = path.join(ROOT, 'db', 'config.json');
const USERS_FILE = path.join(ROOT, 'db', 'users.json');
const PICTURE_DIR = path.join(ROOT, 'picture');

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
   Frontmatter 解析（极简 YAML 子集，仅支持本站使用的字段）
   ============================================================ */

// 解析单个 YAML 值（仅支持标量 + flow 风格数组）
function parseYamlValue(raw) {
  const s = (raw || '').trim();
  if (s === '') return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // flow 数组 [a, b, c]
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(x => parseYamlValue(x));
  }
  // 双引号字符串
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return unescapeYamlDouble(s.slice(1, -1));
  }
  // 单引号字符串
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

function unescapeYamlDouble(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') {
      const next = s[i + 1];
      if (next === 'n') { out += '\n'; i++; }
      else if (next === 't') { out += '\t'; i++; }
      else if (next === 'r') { out += '\r'; i++; }
      else if (next === '\\') { out += '\\'; i++; }
      else if (next === '"') { out += '"'; i++; }
      else { out += next; i++; }
    } else {
      out += c;
    }
  }
  return out;
}

// 把字符串安全嵌入 YAML 值
function yamlValue(v) {
  if (v === null || v === undefined) return '""';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return '[' + v.map(x => String(x).replace(/,/g, '\\,')).join(', ') + ']';
  }
  const s = String(v);
  if (/[:#[\]{}&*?|<>'"%@`\n\r]/.test(s) || s !== s.trim() || s === '') {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
  return s;
}

// 解析 .md 文件 → { id, title, ..., content, _file }
function parseArticleFile(filePath, fileName) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  let meta = {};
  let body = raw;
  if (raw.startsWith('---')) {
    // 找下一个独立行的 ---
    const lines = raw.split(/\r?\n/);
    let end = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') { end = i; break; }
    }
    if (end !== -1) {
      const fmText = lines.slice(1, end).join('\n');
      body = lines.slice(end + 1).join('\n').replace(/^\r?\n/, '');
      // 逐行解析 key: value（不支持嵌套对象，本站用不到）
      fmText.split(/\r?\n/).forEach(line => {
        const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
        if (!m) return;
        meta[m[1]] = parseYamlValue(m[2]);
      });
    }
  }
  // 用文件名兜底 id（如果 frontmatter 缺失）
  if (meta.id === undefined) {
    const m = fileName.match(/^(\d+)/);
    meta.id = m ? parseInt(m[1], 10) : 0;
  }
  // 标准化字段
  const article = {
    id: parseInt(meta.id, 10) || 0,
    title: meta.title || '无标题',
    subscription: meta.subscription === true,
    category: meta.category || 'Development',
    author: meta.author || 'anonymous',
    date: meta.date || '',
    time: meta.time || '',
    weekday: meta.weekday || '',
    comments: parseInt(meta.comments, 10) || 0,
    tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
    summary: meta.summary || '',
    content: body.replace(/\s+$/, '')
  };
  return article;
}

/* ============================================================
   内存索引（启动时扫 db/articles/ 全量加载）
   ============================================================ */
let ARTICLES = []; // 内存中的全部文章对象（含 content）

function initDB() {
  ARTICLES = [];
  if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
    console.log('  db/articles/ 目录已创建');
    return;
  }
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  for (const f of files) {
    try {
      const a = parseArticleFile(path.join(ARTICLES_DIR, f), f);
      ARTICLES.push(a);
    } catch (e) {
      console.error('  解析失败 ' + f + ': ' + e.message);
    }
  }
  // 按日期降序
  ARTICLES.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
  console.log('  数据库已加载: ' + ARTICLES.length + ' 篇文章（来自 ' + files.length + ' 个文件）');
}

function nextId() {
  return ARTICLES.reduce((m, a) => Math.max(m, a.id), 0) + 1;
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

function findRecentDuplicate(title, author, content) {
  const fp = makeFingerprint(title, author, content);
  const now = Date.now();
  for (const article of ARTICLES) {
    const afp = makeFingerprint(article.title, article.author, article.content);
    if (afp !== fp) continue;
    const t = (article.time || '00:00:00 UTC').replace(' UTC','');
    const created = new Date((article.date || '1970-01-01') + 'T' + t + 'Z').getTime();
    if (now - created < DUP_WINDOW_MS) return article;
  }
  return null;
}

/* ============================================================
   文件读写
   ============================================================ */
function articleFilePath(id) {
  return path.join(ARTICLES_DIR, id + '.md');
}

function buildFrontmatter(a) {
  const lines = ['---'];
  lines.push('id: ' + yamlValue(a.id));
  lines.push('title: ' + yamlValue(a.title));
  lines.push('subscription: ' + yamlValue(a.subscription));
  lines.push('category: ' + yamlValue(a.category));
  lines.push('author: ' + yamlValue(a.author));
  lines.push('date: ' + yamlValue(a.date));
  lines.push('time: ' + yamlValue(a.time));
  lines.push('weekday: ' + yamlValue(a.weekday));
  lines.push('comments: ' + yamlValue(a.comments));
  lines.push('tags: ' + yamlValue(a.tags));
  lines.push('summary: ' + yamlValue(a.summary));
  lines.push('---');
  return lines.join('\n');
}

function buildMarkdown(a) {
  return buildFrontmatter(a) + '\n\n' + (a.content || '') + '\n';
}

function writeArticleFile(a) {
  const file = articleFilePath(a.id);
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  fs.writeFileSync(file, buildMarkdown(a), 'utf-8');
}

function deleteArticleFile(id) {
  const file = articleFilePath(id);
  if (!fs.existsSync(file)) return false;
  try { fs.unlinkSync(file); }
  catch (e) {
    if (fs.existsSync(file)) return false;
  }
  return !fs.existsSync(file);
}

/* ============================================================
   CRUD 操作（在内存 + 同步到文件）
   ============================================================ */
function getArticles() {
  // 列表页只需要元数据，不需要 content；评论数取实时统计
  return ARTICLES.map(a => ({
    id: a.id, title: a.title, subscription: a.subscription,
    category: a.category, author: a.author, date: a.date,
    time: a.time, weekday: a.weekday, comments: getCommentCount(a.id),
    tags: a.tags, summary: a.summary
  })).sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
}

function getArticleById(id) {
  const a = ARTICLES.find(x => x.id === parseInt(id));
  if (!a) return null;
  // comments 字段动态取真实评论数（不要 frontmatter 里的旧值）
  return { ...a, comments: getCommentCount(a.id) };
}

function createArticle(data) {
  const dup = findRecentDuplicate(data.title, data.author, data.content);
  if (dup) {
    console.log('  防重复：检测到重复内容，返回已有 #' + dup.id);
    return { ...dup, _duplicate: true };
  }
  const now = new Date();
  // 发布归档：扫描正文，把所有非 picture/ 的本地图片拷贝到 picture/ 并重写引用
  const archived = archivePicturesInContent(data.content || '');
  if (archived.changed) {
    console.log('  归档图片到 picture/:');
    archived.log.forEach(l => console.log(l));
  }
  const article = {
    id: nextId(),
    title: data.title || '无标题',
    subscription: data.subscription === true || data.subscription === 'true',
    category: data.category || 'Development',
    author: data.author || 'anonymous',
    date: data.date || now.toISOString().slice(0, 10),
    time: data.time || now.toISOString().slice(11, 19) + ' UTC',
    weekday: data.weekday || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()],
    comments: 0,
    tags: Array.isArray(data.tags) ? data.tags : [],
    summary: data.summary || '',
    content: archived.content
  };
  writeArticleFile(article);
  ARTICLES.push(article);
  ARTICLES.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
  return article;
}

function updateArticle(id, data) {
  const idx = ARTICLES.findIndex(a => a.id === parseInt(id));
  if (idx === -1) return null;
  // 更新时也走归档（如果用户在新版本里又加了非 picture/ 的引用）
  if (data.content) {
    const archived = archivePicturesInContent(data.content);
    if (archived.changed) {
      console.log('  归档图片到 picture/:');
      archived.log.forEach(l => console.log(l));
    }
    data.content = archived.content;
  }
  const updated = { ...ARTICLES[idx], ...data, id: parseInt(id) };
  // 标准化
  if (typeof updated.subscription === 'string') {
    updated.subscription = updated.subscription === 'true';
  }
  if (!Array.isArray(updated.tags)) updated.tags = [];
  writeArticleFile(updated);
  ARTICLES[idx] = updated;
  ARTICLES.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
  return updated;
}

function deleteArticle(id) {
  const aid = parseInt(id);
  const idx = ARTICLES.findIndex(a => a.id === aid);
  if (idx === -1) return false;
  deleteArticleFile(id);
  ARTICLES.splice(idx, 1);
  // 同步清理对应评论文件（数据一致性）
  const cf = commentsFilePath(aid);
  try { fs.unlinkSync(cf); } catch (e) {}
  COMMENTS_INDEX.delete(aid);
  return true;
}

function getTagIndex() {
  const tagMap = {};
  ARTICLES.forEach(a => {
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
   图片库操作（picture/ 文件夹）
   ============================================================ */
const PICTURE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
const MAX_PIC_SIZE = 10 * 1024 * 1024; // 10MB

function getPictureList(dir) {
  // dir 默认 picture/，也允许列出其他 ROOT 内目录（用于上传后查看任意路径）
  const target = dir ? safeRelativeDir(dir) : PICTURE_DIR;
  if (!target) return [];
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
    return [];
  }
  let files;
  try { files = fs.readdirSync(target); } catch (e) { return []; }
  return files
    .filter(f => PICTURE_EXT.has(path.extname(f).toLowerCase()))
    .map(f => {
      try {
        const st = fs.statSync(path.join(target, f));
        const rel = path.relative(ROOT, path.join(target, f)).replace(/\\/g, '/');
        return {
          name: f,
          size: st.size,
          sizeText: formatBytes(st.size),
          modified: st.mtime.toISOString(),
          // 相对于站点根的 URL（路径分隔符用 /）
          url: '/' + rel.split('/').map(encodeURIComponent).join('/'),
          // markdown 引用：相对 picture/ 目录还是相对任意路径
          ref: rel
        };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.modified || '').localeCompare(a.modified || ''));
}

// 把任意相对路径安全限制到 ROOT 内：返回绝对路径或 null
function safeRelativeDir(rel) {
  if (!rel) return null;
  // 标准化：去掉前导 / 和 ./
  let p = String(rel).replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
  if (!p || p === '..' || p.startsWith('../') || p.includes('/../') || p.includes('/..')) {
    return null;
  }
  const abs = path.join(ROOT, p);
  if (!abs.startsWith(ROOT)) return null;
  return abs;
}

// 给一个相对路径的文件名做安全处理（用于上传到任意目录）
function sanitizeFileName(fileName) {
  return String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

// 把图片保存到任意相对目录（基于 ROOT）
function savePictureToDir(dirRel, fileName, buffer) {
  const targetDir = safeRelativeDir(dirRel || 'picture');
  if (!targetDir) throw new Error('保存路径无效');
  const safeName = sanitizeFileName(fileName);
  if (!safeName) throw new Error('文件名无效');
  const ext = path.extname(safeName).toLowerCase();
  if (!PICTURE_EXT.has(ext)) throw new Error('不支持的图片类型: ' + ext);
  fs.mkdirSync(targetDir, { recursive: true });
  // 同名自动改名
  let finalName = safeName;
  let i = 1;
  while (fs.existsSync(path.join(targetDir, finalName))) {
    finalName = path.basename(safeName, ext) + '_' + i + ext;
    i++;
  }
  const finalDest = path.join(targetDir, finalName);
  fs.writeFileSync(finalDest, buffer);
  // 返回相对 ROOT 的引用路径（markdown 用的形式）
  const relRef = path.relative(ROOT, finalDest).replace(/\\/g, '/');
  return {
    name: finalName,
    ref: relRef,                                          // markdown 引用，如 images/foo.png
    url: '/' + relRef.split('/').map(encodeURIComponent).join('/'),
    size: buffer.length,
    sizeText: formatBytes(buffer.length)
  };
}

function deletePicture(name) {
  const safeName = path.basename(name); // 防穿越
  const ext = path.extname(safeName).toLowerCase();
  if (!PICTURE_EXT.has(ext)) return false;
  const file = path.join(PICTURE_DIR, safeName);
  if (!fs.existsSync(file)) return false;
  try {
    fs.unlinkSync(file);
  } catch (e) {
    if (fs.existsSync(file)) return false;
  }
  return !fs.existsSync(file);
}

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

/* ============================================================
   发布归档：扫描 markdown，把非 picture/ 的本地图片拷贝到 picture/ 并重写引用
   ============================================================ */

// 给定一个相对 ROOT 的引用路径，物理拷贝到 picture/ 下并返回新引用
// 若源文件不存在或拷贝失败，返回 null（调用方保持原引用不变）
function archivePictureRef(relPath) {
  // 跳过 picture/ 开头（已归档）
  const p = String(relPath).replace(/\\/g, '/').replace(/^\.\//, '');
  if (p.startsWith('picture/') || p === 'picture') return p;
  const src = path.join(ROOT, p);
  // 安全检查：必须在 ROOT 内
  if (!src.startsWith(ROOT)) return null;
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return null;

  const ext = path.extname(p).toLowerCase();
  if (!PICTURE_EXT.has(ext)) return null;

  // 目标文件名：保留原名，冲突时加序号
  const origName = path.basename(p);
  let finalName = sanitizeFileName(origName);
  if (!finalName) finalName = 'image_' + Date.now() + ext;
  fs.mkdirSync(PICTURE_DIR, { recursive: true });
  let i = 1;
  while (fs.existsSync(path.join(PICTURE_DIR, finalName))) {
    finalName = path.basename(origName, ext) + '_' + i + ext;
    finalName = sanitizeFileName(finalName);
    i++;
  }
  const dest = path.join(PICTURE_DIR, finalName);
  try {
    fs.copyFileSync(src, dest);
  } catch (e) {
    return null;
  }
  return 'picture/' + finalName;
}

// 扫描 markdown content，把所有本地非 picture/ 的图片引用归档到 picture/
function archivePicturesInContent(content) {
  if (!content) return content;
  let changed = false;
  const log = [];

  // markdown 图片：![alt](path) 或 ![alt](path "title")
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, rawPath) => {
    const parts = rawPath.trim().split(/\s+/);
    const url = parts[0];
    // 跳过外链、绝对 URL、data:
    if (/^(https?:|data:|\/)/i.test(url)) return m;
    if (url.startsWith('picture/')) return m;
    const archived = archivePictureRef(url);
    if (!archived) return m;
    changed = true;
    log.push('  ' + url + ' → ' + archived);
    const rest = parts.length > 1 ? ' ' + parts.slice(1).join(' ') : '';
    return '![' + alt + '](' + archived + rest + ')';
  });

  // HTML img：<img src="path" /> 或 <img src='path' />
  content = content.replace(/(<img\s+[^>]*?src=["'])([^"']+)(["'][^>]*?>)/gi, (m, pre, rawPath, post) => {
    if (/^(https?:|data:|\/)/i.test(rawPath)) return m;
    if (rawPath.startsWith('picture/')) return m;
    const archived = archivePictureRef(rawPath);
    if (!archived) return m;
    changed = true;
    log.push('  ' + rawPath + ' → ' + archived);
    return pre + archived + post;
  });

  return { content, changed, log };
}

/* ============================================================
   用户系统 — 注册 + 登录（普通用户），与管理员密码登录并存
   - 密码用 Node 内置 crypto.scrypt 哈希（不引入 bcrypt）
   - db/users.json 持久化普通用户
   - Token 随机 32 字节 hex，内存索引 token → {userId, expiresAt}，TTL 7 天
   - 旧管理员密码（CONFIG.password）保留，admin.html 用，未走用户 token
   ============================================================ */
const USER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

// 启动时从 db/users.json 加载普通用户
let USERS = []; // [{id, username, passwordHash, salt, createdAt, displayName}, ...]
let USER_TOKENS = new Map(); // token -> {userId, expiresAt}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
  try {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    USERS = (data.users || []).map(u => ({
      id: u.id, username: u.username, passwordHash: u.passwordHash, salt: u.salt,
      createdAt: u.createdAt, displayName: u.displayName || u.username
    }));
  } catch (e) {
    USERS = [];
  }
  console.log('  用户索引已加载: ' + USERS.length + ' 个普通用户');
}

function saveUsers() {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users: USERS }, null, 2));
}

// 密码哈希：scrypt(密码, salt) → 比较
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function createUser(username, password) {
  if (!username || !password) return { error: '用户名和密码不能为空' };
  username = String(username).trim();
  if (username.length < 2 || username.length > 30) return { error: '用户名长度需在 2-30 之间' };
  if (!/^[A-Za-z0-9_\-.]+$/.test(username)) return { error: '用户名只能包含字母、数字、下划线、短横线、点号' };
  if (String(password).length < 4) return { error: '密码至少 4 位' };
  if (String(password).length > 100) return { error: '密码过长（最多 100 位）' };
  if (USERS.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { error: '该用户名已被注册' };
  }
  const salt = makeSalt();
  const u = {
    id: USERS.reduce((m, u) => Math.max(m, u.id), 0) + 1,
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    displayName: username
  };
  USERS.push(u);
  saveUsers();
  return u;
}

function verifyPassword(user, password) {
  const hash = hashPassword(password, user.salt);
  // 时间常数比较（防止侧信道）
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(user.passwordHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function findUser(username) {
  if (!username) return null;
  const u = username.toLowerCase();
  return USERS.find(x => x.username.toLowerCase() === u) || null;
}

function issueToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  USER_TOKENS.set(token, {
    userId,
    expiresAt: Date.now() + USER_TOKEN_TTL_MS
  });
  // 顺手清理过期 token
  for (const [k, v] of USER_TOKENS) if (v.expiresAt < Date.now()) USER_TOKENS.delete(k);
  return token;
}

function getAuthUser(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+([A-Fa-f0-9]{64})$/);
  if (!m) return null;
  const tok = m[1];
  const meta = USER_TOKENS.get(tok);
  if (!meta) return null;
  if (meta.expiresAt < Date.now()) { USER_TOKENS.delete(tok); return null; }
  const u = USERS.find(x => x.id === meta.userId);
  if (!u) return null;
  // 返回时不带密码相关字段
  return { id: u.id, username: u.username, displayName: u.displayName, createdAt: u.createdAt };
}

function revokeToken(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+([A-Fa-f0-9]{64})$/);
  if (m) USER_TOKENS.delete(m[1]);
}

function publicUser(u) {
  return { id: u.id, username: u.username, displayName: u.displayName, createdAt: u.createdAt };
}

/* ============================================================
   评论数据层 — 每篇文章一个 db/comments/{articleId}.json
   评论 ID 全局自增（避免跨文章 ID 冲突）
   ============================================================ */
let CURRENT_COMMENT_ID = 1;

function commentsFilePath(articleId) {
  return path.join(COMMENTS_DIR, articleId + '.json');
}

function readCommentsFile(articleId) {
  const f = commentsFilePath(articleId);
  try { return JSON.parse(fs.readFileSync(f, 'utf-8')); }
  catch (e) { return { comments: [] }; }
}

function writeCommentsFile(articleId, data) {
  fs.mkdirSync(COMMENTS_DIR, { recursive: true });
  const f = commentsFilePath(articleId);
  try {
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// 启动时扫描所有评论文件，更新 CURRENT_COMMENT_ID 和 article→comments 索引
let COMMENTS_INDEX = new Map(); // articleId -> array of comments

function initComments() {
  COMMENTS_INDEX = new Map();
  let maxId = 0;
  if (!fs.existsSync(COMMENTS_DIR)) {
    fs.mkdirSync(COMMENTS_DIR, { recursive: true });
  } else {
    const files = fs.readdirSync(COMMENTS_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(COMMENTS_DIR, f), 'utf-8'));
        const aid = parseInt(f.replace('.json', ''), 10);
        if (data.comments && data.comments.length) {
          COMMENTS_INDEX.set(aid, data.comments);
          for (const c of data.comments) {
            if (c.id > maxId) maxId = c.id;
          }
        }
      } catch (e) { /* 跳过损坏文件 */ }
    }
  }
  CURRENT_COMMENT_ID = maxId + 1;
  console.log('  评论索引已加载: ' + COMMENTS_INDEX.size + ' 个文章有评论');
}

function getComments(articleId) {
  return COMMENTS_INDEX.get(parseInt(articleId)) || [];
}

function addComment(articleId, data) {
  const aid = parseInt(articleId);
  if (!ARTICLES.find(a => a.id === aid)) return null;
  // 先校验内容，再分配 ID，避免空评论浪费 ID
  const content = (data.content || '').toString().slice(0, 5000);
  if (!content.trim()) return { error: '评论内容不能为空' };
  const now = new Date();
  const c = {
    id: CURRENT_COMMENT_ID++,
    author: (data.author || 'anonymous').toString().slice(0, 50),
    content,
    date: data.date || now.toISOString().slice(0, 10),
    time: data.time || now.toISOString().slice(11, 19) + ' UTC',
    weekday: data.weekday || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()]
  };
  const list = COMMENTS_INDEX.get(aid) || [];
  list.push(c);
  list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  COMMENTS_INDEX.set(aid, list);
  writeCommentsFile(aid, { comments: list });
  return c;
}

function deleteComment(articleId, commentId) {
  const aid = parseInt(articleId);
  const list = COMMENTS_INDEX.get(aid);
  if (!list) return false;
  const idx = list.findIndex(c => c.id === parseInt(commentId));
  if (idx === -1) return false;
  list.splice(idx, 1);
  if (list.length === 0) {
    COMMENTS_INDEX.delete(aid);
    // 删空文件
    try { fs.unlinkSync(commentsFilePath(aid)); } catch (e) {}
  } else {
    writeCommentsFile(aid, { comments: list });
  }
  return true;
}

function getCommentCount(articleId) {
  return getComments(articleId).length;
}

function findComment(articleId, commentId) {
  const list = COMMENTS_INDEX.get(parseInt(articleId));
  if (!list) return null;
  return list.find(c => c.id === parseInt(commentId)) || null;
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
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.bmp': 'image/bmp',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8'
};

function sendJSON(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', c => {
      total += c.length;
      if (opts.maxSize && total > opts.maxSize) {
        reject(new Error('文件过大，最大 ' + (opts.maxSize / 1024 / 1024) + 'MB'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function readJSONBody(req) {
  return readBody(req).then(buf => {
    try { return JSON.parse(buf.toString('utf-8')); }
    catch (e) { return {}; }
  });
}

function checkAuth(req) {
  const auth = req.headers['authorization'] || '';
  return auth === 'Bearer ' + CONFIG.password;
}

function getBoundary(req) {
  const ct = req.headers['content-type'] || '';
  const m = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return m ? (m[1] || m[2]) : null;
}

/* ============================================================
   API 路由
   ============================================================ */
async function handleAPI(req, res, pathname, method, urlObj) {
  // ---- 文章 ----
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

  // ---- 评论 ----
  const commentsList = pathname.match(/^\/api\/articles\/(\d+)\/comments$/);
  if (commentsList && method === 'GET') {
    return sendJSON(res, 200, getComments(commentsList[1]));
  }
  if (commentsList && method === 'POST') {
    // 公开接口，不需要认证（任何人都能评论）
    const body = await readJSONBody(req);
    const result = addComment(commentsList[1], body);
    if (result === null) return sendJSON(res, 404, { error: '文章不存在' });
    if (result.error) return sendJSON(res, 400, result);
    return sendJSON(res, 201, result);
  }
  const commentDel = pathname.match(/^\/api\/articles\/(\d+)\/comments\/(\d+)$/);
  if (commentDel && method === 'DELETE') {
    if (!checkAuth(req)) return sendJSON(res, 401, { error: '未授权' });
    if (deleteComment(commentDel[1], commentDel[2])) {
      return sendJSON(res, 200, { ok: true });
    }
    return sendJSON(res, 404, { error: '评论不存在' });
  }

  if (pathname === '/api/login' && method === 'POST') {
    const body = await readJSONBody(req);
    if (body.password === CONFIG.password) {
      return sendJSON(res, 200, { token: CONFIG.password, ok: true });
    }
    return sendJSON(res, 401, { error: '密码错误' });
  }

  // ---- 用户（普通读者注册/登录，与管理员密码登录并存） ----
  if (pathname === '/api/users/register' && method === 'POST') {
    const body = await readJSONBody(req);
    const u = createUser(body.username, body.password);
    if (u.error) return sendJSON(res, 400, { error: u.error });
    const token = issueToken(u.id);
    return sendJSON(res, 201, { ok: true, token, user: publicUser(u) });
  }

  if (pathname === '/api/users/login' && method === 'POST') {
    const body = await readJSONBody(req);
    const u = findUser(body.username);
    if (!u) return sendJSON(res, 401, { error: '用户名或密码错误' });
    if (!verifyPassword(u, String(body.password || ''))) {
      return sendJSON(res, 401, { error: '用户名或密码错误' });
    }
    const token = issueToken(u.id);
    return sendJSON(res, 200, { ok: true, token, user: publicUser(u) });
  }

  if (pathname === '/api/users/me' && method === 'GET') {
    const u = getAuthUser(req);
    if (!u) return sendJSON(res, 401, { error: '未登录或 token 已失效' });
    return sendJSON(res, 200, { user: u });
  }

  if (pathname === '/api/users/logout' && method === 'POST') {
    revokeToken(req);
    return sendJSON(res, 200, { ok: true });
  }

  // ---- 用户资料（公开：列出用户名，用于评论显示） ----
  if (pathname === '/api/users' && method === 'GET') {
    return sendJSON(res, 200, { users: USERS.map(publicUser) });
  }

  // 写操作（需要认证）
  if (pathname === '/api/articles' && method === 'POST') {
    if (!checkAuth(req)) return sendJSON(res, 401, { error: '未授权' });
    const body = await readJSONBody(req);
    const article = createArticle(body);
    const status = article._duplicate ? 200 : 201;
    return sendJSON(res, status, article);
  }

  if (articleMatch) {
    const id = articleMatch[1];
    if (method === 'PUT') {
      if (!checkAuth(req)) return sendJSON(res, 401, { error: '未授权' });
      const body = await readJSONBody(req);
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

  // ---- 图片库 ----
  if (pathname === '/api/pictures' && method === 'GET') {
    // 可选 ?dir=xxx 列出指定目录，默认 picture
    const dir = urlObj.searchParams.get('dir') || '';
    return sendJSON(res, 200, getPictureList(dir));
  }

  if (pathname === '/api/pictures' && method === 'POST') {
    if (!checkAuth(req)) return sendJSON(res, 401, { error: '未授权' });
    // multipart/form-data 上传
    const ct = req.headers['content-type'] || '';
    if (!ct.toLowerCase().includes('multipart/form-data')) {
      return sendJSON(res, 400, { error: '需要 multipart/form-data' });
    }
    const boundary = getBoundary(req);
    if (!boundary) return sendJSON(res, 400, { error: '缺少 boundary' });
    const buf = await readBody(req, { maxSize: MAX_PIC_SIZE });
    const parts = parseMultipart(buf, boundary);
    const filePart = parts.find(p => p.filename);
    if (!filePart) return sendJSON(res, 400, { error: '未找到图片文件' });
    // 保存路径：优先表单字段 path，默认 picture
    const pathField = parts.find(p => p.name === 'path');
    let savePath = 'picture';
    if (pathField) {
      try { savePath = pathField.data.toString('utf-8').trim() || 'picture'; }
      catch (e) { savePath = 'picture'; }
    }
    try {
      const info = savePictureToDir(savePath, filePart.filename, filePart.data);
      return sendJSON(res, 201, info);
    } catch (e) {
      return sendJSON(res, 400, { error: e.message });
    }
  }

  const picMatch = pathname.match(/^\/api\/pictures\/([^/]+)$/);
  if (picMatch && method === 'DELETE') {
    if (!checkAuth(req)) return sendJSON(res, 401, { error: '未授权' });
    const ok = deletePicture(decodeURIComponent(picMatch[1]));
    if (ok) return sendJSON(res, 200, { ok: true });
    return sendJSON(res, 404, { error: '图片不存在' });
  }

  sendJSON(res, 404, { error: 'API 不存在' });
}

/* ============================================================
   极简 multipart/form-data 解析
   ============================================================ */
function parseMultipart(buf, boundary) {
  const parts = [];
  const sep = Buffer.from('--' + boundary);
  // 分段
  let start = 0;
  while (true) {
    const s = buf.indexOf(sep, start);
    if (s === -1) break;
    const next = buf.indexOf(sep, s + sep.length);
    if (next === -1) break;
    const body = buf.slice(s + sep.length, next);
    // 跳过尾 -- 表示结束
    if (body[0] === 0x2D && body[1] === 0x2D) break; // "--"
    // 找到 \r\n\r\n 分隔头和体
    const headEnd = body.indexOf('\r\n\r\n');
    if (headEnd === -1) { start = next; continue; }
    const head = body.slice(0, headEnd).toString('utf-8');
    const data = body.slice(headEnd + 4, body.length - 2); // 去掉末尾 \r\n
    // 解析 Content-Disposition
    const nameM = head.match(/name="([^"]+)"/);
    const fileM = head.match(/filename="([^"]*)"/);
    const typeM = head.match(/Content-Type:\s*([^\r\n]+)/i);
    parts.push({
      name: nameM ? nameM[1] : '',
      filename: fileM ? fileM[1] : null,
      contentType: typeM ? typeM[1].trim() : 'application/octet-stream',
      data: data
    });
    start = next;
  }
  return parts;
}

/* ============================================================
   静态文件服务
   白名单策略：只允许 / /index.html /about.html /article.html
   /search.html /tags.html /admin.html，以及 /css/* /js/* /picture/*
   四类目录下的资源。其他一律 404，防止 /db/config.json、/server.js、
   /.git/HEAD 等敏感文件被任意下载。
   ============================================================ */
const STATIC_WHITELIST_HTML = new Set([
  '/', '/index.html', '/about.html', '/article.html',
  '/search.html', '/tags.html', '/admin.html',
  '/login.html', '/register.html'
]);
const STATIC_WHITELIST_PREFIX = ['/css/', '/js/', '/picture/'];

function serveStatic(req, res, pathname) {
  // 白名单：先看 pathname 是否被允许
  const isAllowed =
    STATIC_WHITELIST_HTML.has(pathname) ||
    STATIC_WHITELIST_PREFIX.some(p => pathname.startsWith(p));
  if (!isAllowed) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1>');
    return;
  }
  // 用 path.join 拼到 ROOT 下（path.join 把前导 / 当片段，不会变绝对路径）
  // 然后 path.resolve 拿到标准绝对路径
  // 严格 startsWith 检查防 ../ 逃出
  const filePath = path.resolve(path.join(ROOT, pathname === '/' ? 'index.html' : pathname));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
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
initComments();
loadUsers();

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(urlObj.pathname);
    const method = req.method;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (pathname.startsWith('/api/')) {
      await handleAPI(req, res, pathname, method, urlObj);
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
  console.log(`  数据: db/articles/*.md  (${ARTICLES.length} 篇)`);
  console.log(`  图片: ${getPictureList().length} 张 (picture/)`);
  console.log(`  ────────────────────────────\n`);
});
