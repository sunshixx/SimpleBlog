/**
 * 种子脚本 - 将 js/data.js 中的示例文章导入 JSON 数据库
 * 运行: node seed.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DB_FILE = path.join(__dirname, 'db', 'articles.json');

// 从 data.js 中提取 ARTICLES 数组（将 const 改为 var 以便沙箱可访问）
const dataContent = fs.readFileSync(path.join(__dirname, 'js', 'data.js'), 'utf-8')
  .replace(/const ARTICLES/, 'var ARTICLES');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(dataContent, sandbox);
const articles = sandbox.ARTICLES;

// 写入数据库
const db = {
  articles: articles.map(a => ({ ...a })),
  nextId: articles.length + 1
};

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

console.log(`✓ 已导入 ${articles.length} 篇文章到 ${DB_FILE}`);
console.log(`  文章列表:`);
articles.forEach(a => {
  console.log(`  [${a.id}] [${a.category}] ${a.title}`);
});
console.log(`\n  下一个 ID: ${db.nextId}`);
