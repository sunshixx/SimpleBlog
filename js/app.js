/* ============================================================
   博客应用逻辑 - API 驱动版
   从后端 /api/articles 获取数据，渲染 lwn.net 风格页面
   ============================================================ */

/* ---------- Markdown 配置 ---------- */
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

function renderMarkdown(md) {
  if (typeof marked !== 'undefined') return marked.parse(md);
  const esc = (md || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<p>' + esc.replace(/\n\n/g, '</p><p>') + '</p>';
}

/* ---------- API 调用 ---------- */
async function fetchArticles() {
  const res = await fetch('/api/articles');
  return res.json();
}

async function fetchArticle(id) {
  const res = await fetch('/api/articles/' + id);
  return res.json();
}

async function fetchTagIndex() {
  const res = await fetch('/api/tags');
  return res.json();
}

/* ---------- 日期格式化（复刻 lwn.net 格式） ---------- */
function formatDate(dateStr, time, weekday) {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = months[d.getMonth()] || 'Jan';
  const day = d.getDate();
  const year = d.getFullYear();
  return `Posted ${m} ${day}, ${year} ${time || ''} (${weekday || ''})`;
}

/* ---------- 共享布局 ---------- */
function renderLayout(targetBodyContent, sidebarCats) {
  // 默认 6 个分类 + 动态从 articles 提取的分类，去重排序，截断前 10 个
  const defaultCats = ["Kernel","Security","Development","Distributions","Briefs","Announcements"];
  const merged = [...new Set([...defaultCats, ...(sidebarCats || [])])];
  const finalCats = merged.slice(0, 10);
  const catsHTML = finalCats.map(c =>
    `<li><a href="search.html?cats=${encodeURIComponent(c)}">${escapeHtml(c)}</a></li>`
  ).join('');

  const layout = `
<div id="menu">
  <a href="index.html" aria-label="返回首页">
    <span class="logo">OSS<br>.Notes</span>
    <span class="logobl">来自开源世界的观察</span>
  </a>
  <div class="navmenu-container">
    <ul class="navmenu">
      <li><a class="navmenu" href="#t"><b>内容</b></a>
        <ul>
          <li><a href="index.html">首页</a></li>
          <li><a href="tags.html">标签分类</a></li>
          <li><a href="search.html">搜索</a></li>
          <li class="cats-sep"><hr></li>
          ${catsHTML}
          <li><a href="about.html">关于</a></li>
          <li><hr></li>
          <li><a href="admin.html">写作入口</a></li>
          <li><a href="about.html#contact">联系方式</a></li>
        </ul>
      </li>
    </ul>
  </div>
</div>
<div class="topnav-spacer"></div>
<div class="top-banner not-print"></div>
<div class="topnav-container">
  <div class="not-handset">
    <form action="search.html" method="get" class="loginform" onsubmit="window.location.href='search.html?q='+encodeURIComponent(this.q.value);return false;">
      <label><b>搜索：</b> <input type="text" name="q" value="" size="12" id="searchbox" placeholder="关键词..." /></label>
      <input type="submit" value="搜索" />
    </form> |
    <form action="about.html" class="loginform"><input type="submit" value="关于" /></form> |
    <form action="tags.html" class="loginform"><input type="submit" value="标签" /></form> |
    <form action="admin.html" class="loginform"><input type="submit" value="写作" /></form> |
    <form action="index.html" class="loginform"><input type="submit" value="首页" /></form>
  </div>
  <div class="handset-only">
    <a href="index.html"><b>首页</b></a> /
    <a href="search.html"><b>搜索</b></a> /
    <a href="about.html"><b>关于</b></a> /
    <a href="tags.html"><b>标签</b></a> /
    <a href="admin.html"><b>写作</b></a>
  </div>
</div>
${targetBodyContent}
<br clear="all">
<center>
  <P>
  <span class="ReallySmall">
  Copyright &copy; 2026, OSS Notes<br>
  本站文章版权归原作者所有<br>
  </span>
</center>
`;
  document.body.innerHTML = layout;
}

/* ---------- 文章列表项 HTML ---------- */
function articleListingHTML(article) {
  const subMark = article.subscription ? '[<span class="Subscription">$</span>] ' : '';
  const metaLine = `<span class="Smaller">[${article.category}] ${formatDate(article.date, article.time, article.weekday)} by ${article.author}</span>`;
  const fullStory = article.comments > 0
    ? `<a href="article.html?id=${article.id}">Full Story</a> (<a href="article.html?id=${article.id}#Comments">comments: ${article.comments}</a>)`
    : `<a href="article.html?id=${article.id}">Comments (none posted)</a>`;
  return `
    <h2 class="Headline">${subMark}<a href="article.html?id=${article.id}" style="color:inherit;text-decoration:none;">${escapeHtml(article.title)}</a></h2>
    <div class="BlurbListing">
      ${metaLine}
      <p>${escapeHtml(article.summary)}
      <p>${fullStory}
      <p>
    </div>
  `;
}

/* ---------- 首页（清爽版：居中搜索 + 精选文章 + 简讯折叠） ---------- */
async function renderHomePage() {
  const articles = await fetchArticles();
  const featured = articles.filter(a => a.subscription);
  const briefs = articles.filter(a => !a.subscription);

  const featuredHTML = featured.slice(0, 6).map(articleListingHTML).join('\n');
  const briefsHTML = briefs.map(articleListingHTML).join('\n');
  const briefsCount = briefs.length;

  // 取所有出现过的分类，用于筛选
  const allCats = [...new Set(articles.map(a => a.category))].sort();

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="ArticleText"><main>

      <h1 class="HomeTitle">OSS Notes 内容归档</h1>
      <p>欢迎使用 OSS Notes 全文搜索。下面可以搜索全部文章。
      <p>检索语法简单直接；关键词大小写不敏感。将关键词加引号（如 "exact phrase"）可做精确匹配。

      <div class="lwn-search-box">
        <form onsubmit="return submitSearchForm(this);">
          <div class="lwn-search-row">
            <span class="lwn-search-label"><b>Query：</b></span>
            <input type="text" name="q" size="40" autofocus placeholder="输入关键词搜索..." />
          </div>
          <div class="lwn-search-row">
            <span class="lwn-search-label"><b>分类筛选：</b></span>
            <div class="lwn-cats">
              ${allCats.map(c => `<label><input type="checkbox" name="cat" value="${c}" checked /> ${c}</label>`).join('')}
              <a href="#" onclick="
                var bs=this.parentNode.querySelectorAll('input[type=checkbox]');
                var all=Array.from(bs).every(function(b){return b.checked;});
                bs.forEach(function(b){b.checked=!all;});
                return false;" style="margin-left:0.5em">全部切换</a>
            </div>
          </div>
          <div class="lwn-search-row">
            <span class="lwn-search-label"><b>排序：</b></span>
            <label><input type="radio" name="order" value="relevance" /> 相关度</label>
            <label><input type="radio" name="order" value="date" checked /> 日期</label>
          </div>
          <div class="lwn-search-row">
            <input type="submit" value="搜索" class="lwn-search-btn" />
          </div>
        </form>
      </div>

      <h2 class="Headline">精选文章</h2>
      <div class="FPBox">
        <div class="FPLeft">${featuredHTML || '<div class="BlurbListing"><p>暂无精选文章，欢迎<a href="admin.html">投稿</a>。</p></div>'}</div>
        <div class="FPRight"></div>
      </div>

      <div class="briefs-toggle-wrap">
        <button id="briefsToggle" class="briefs-toggle" aria-expanded="false">
          ▶ 推文（${briefsCount} 条简讯）— 点击展开/收起
        </button>
        <div id="briefsPanel" class="briefs-panel" hidden>
          <div class="FPBox">
            <div class="FPLeft FPLeft-wide">${briefsHTML || '<div class="BlurbListing"><p>暂无简讯。</p></div>'}</div>
          </div>
        </div>
      </div>

    </main></div>
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent, [...new Set(articles.map(a => a.category))]);

  // 折叠区绑定（renderLayout 已替换 body，需异步挂载）
  setTimeout(() => {
    const btn = document.getElementById('briefsToggle');
    const panel = document.getElementById('briefsPanel');
    if (btn && panel) {
      btn.addEventListener('click', () => {
        const isOpen = !panel.hasAttribute('hidden');
        if (isOpen) {
          // 关闭
          panel.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'false');
          btn.dataset.open = '0';
          btn.innerHTML = '▶ ' + btn.dataset.label;
        } else {
          // 打开
          panel.removeAttribute('hidden');
          btn.setAttribute('aria-expanded', 'true');
          btn.dataset.open = '1';
          btn.innerHTML = '▼ ' + btn.dataset.label;
        }
      });
      // 初始化 dataset.label（保存标签文本，去掉首字符 ▶ ）
      btn.dataset.label = btn.textContent.replace(/^[▶▼]\s*/, '');
      btn.dataset.open = '0';
    }
  }, 0);
}

/* ---------- 文章详情 ---------- */
async function renderArticlePage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || 1;

  // 并发拉：单个文章（带 content）+ 列表（用于侧边栏分类）
  let article = null;
  let allArticles = [];
  try {
    [article, allArticles] = await Promise.all([
      fetchArticle(id).catch(() => null),
      fetchArticles().catch(() => [])
    ]);
  } catch (e) {
    // 失败时 article 已经是 null, allArticles 已经是 []
  }

  if (!article || article.error) {
    renderLayout(`
      <div class="maincolumn flexcol"><div class="middlecolumn">
        <div class="PageHeadline"><h1>文章未找到</h1></div>
        <div class="ArticleText"><main>
          <p>请求的文章不存在。请返回<a href="index.html">首页</a>浏览其他文章。</p>
        </main></div>
      </div><div class="rightcol not-print"></div></div>
    `, allArticles.map(a => a.category));
    return;
  }

  const subMark = article.subscription ? '[<span class="Subscription">$</span>] ' : '';
  const tagsHTML = (article.tags || []).map(t =>
    `<a href="tags.html?tag=${t}" class="tag-badge">${t}</a>`
  ).join('');

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="PageHeadline"><h1>${subMark}${escapeHtml(article.title)}</h1></div>
    <div class="ArticleText"><main>
      <div class="article-meta">
        <span class="category-badge">${article.category}</span>
        ${formatDate(article.date, article.time, article.weekday)} by <b>${article.author}</b>
        | <a href="index.html">返回列表</a>
      </div>
      <div class="markdown-body">${renderMarkdown(article.content)}</div>
      <a name="Comments"></a>
      <h2 class="Headline">评论</h2>
      <div class="BlurbListing">
        <p>本文共有 ${article.comments} 条评论。</p>
        <p><i>评论系统为演示用途，演示版不开放评论功能。</i></p>
      </div>
      <h2 class="Headline">标签</h2>
      <div class="BlurbListing">${tagsHTML}</div>
    </main></div>
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent, [...new Set(allArticles.map(a => a.category))]);
  document.title = `${article.title} [OSS Notes]`;
}

/* ---------- 搜索页 ---------- */
// 共享：从某个 form 收集 q + 选中的 cats，跳转到搜索页
window.submitSearchForm = function(form) {
  var q = form.querySelector('[name=q]').value;
  var cs = Array.from(form.querySelectorAll('[name=cat]:checked')).map(function(c){return c.value;});
  var url = 'search.html?q=' + encodeURIComponent(q);
  if (cs.length) url += '&cats=' + encodeURIComponent(cs.join(','));
  window.location.href = url;
  return false;
};

async function renderSearchPage() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q') || '';
  const cat = params.get('cat') || '';        // 单选，向后兼容
  const cats = (params.get('cats') || '').split(',').map(s => s.trim()).filter(Boolean);

  let allArticles = [];
  try {
    allArticles = await fetchArticles();
  } catch (e) {
    allArticles = [];
  }

  // 动态提取所有分类：从文章中提取 + 合并硬编码默认（保证默认6个分类即使无文章也展示）
  const defaultCats = ["Kernel","Security","Development","Distributions","Briefs","Announcements"];
  const dynCats = [...new Set(allArticles.map(a => a.category))];
  const allCats = [...new Set([...defaultCats, ...dynCats])].sort();

  // 当前选中的分类集合（小写）
  const catsSet = new Set(cats.map(c => c.toLowerCase()));
  if (cat) catsSet.add(cat.toLowerCase());
  const hasFilter = catsSet.size > 0;

  // 过滤逻辑
  let results = allArticles;
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q)) ||
      a.category.toLowerCase().includes(q) ||
      a.author.toLowerCase().includes(q)
    );
  }
  if (catsSet.size) {
    results = results.filter(a => catsSet.has(a.category.toLowerCase()));
  }

  let resultsHTML = '';
  if (query || cat || cats.length) {
    if (results.length === 0) {
      resultsHTML = `<div class="no-results">未找到匹配 "${escapeHtml(query || (cats.join(',') || cat))}" 的文章。</div>`;
    } else {
      resultsHTML = results.map(a => {
        const subMark = a.subscription ? '[<span class="Subscription">$</span>] ' : '';
        return `
          <div class="search-result">
            <h3 class="Headline">${subMark}<a href="article.html?id=${a.id}" style="color:inherit;text-decoration:none;">${highlightMatch(a.title, query)}</a></h3>
            <div class="BlurbListing">
              <span class="Smaller">[${a.category}] ${formatDate(a.date, a.time, a.weekday)} by ${a.author}</span>
              <p>${highlightMatch(a.summary, query)}</p>
              <a href="article.html?id=${a.id}">Full Story</a> (comments: ${a.comments})
            </div>
          </div>
        `;
      }).join('\n');
    }
  }

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="PageHeadline"><h1>搜索文章归档</h1></div>
    <div class="ArticleText"><main>
      欢迎使用 OSS Notes 搜索引擎。
      <p>在这里可以搜索全部内容。将搜索字符串用引号括起可搜索连续词组。
      <p>
      <blockquote>
      <form onsubmit="return submitSearchForm(this);">
      <table class="Form">
        <tr><td valign="top"><b>查询：</b></td>
          <td valign="top"><input type="text" name="q" value="${escapeHtml(query)}" size="40" autofocus /></td></tr>
        <tr><td valign="top"><b>分类筛选：</b></td>
          <td valign="top">
            <div class="lwn-cats">
              ${allCats.map(c => {
                const lc = c.toLowerCase();
                const checked = hasFilter ? (catsSet.has(lc) ? 'checked' : '') : 'checked';
                return `<label><input type="checkbox" name="cat" value="${c}" ${checked} onchange="submitSearchForm(this.form);" /> ${c}</label>`;
              }).join('')}
              <a href="#" onclick="
                var bs=this.parentNode.querySelectorAll('input[type=checkbox]');
                var all=Array.from(bs).every(function(b){return b.checked;});
                bs.forEach(function(b){b.checked=!all;});
                return submitSearchForm(bs.length?bs[0].form:null);" style="margin-left:0.5em">全部切换</a>
            </div>
          </td></tr>
        <tr><td valign="top"><b></b></td>
          <td valign="top"><input type="submit" value="搜索" /></td></tr>
      </table>
      </form>
      </blockquote>
      ${query || cat || cats.length ? `<h2 class="Headline">搜索结果${query ? '："' + escapeHtml(query) + '"' : ''}${cats.length ? ' [分类: ' + escapeHtml(cats.join(', ')) + ']' : ''}${cat && !cats.length ? ' [分类: ' + escapeHtml(cat) + ']' : ''}</h2><div class="BlurbListing">${resultsHTML}</div>` : ''}
    </main></div>
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent, [...new Set(allArticles.map(a => a.category))]);
}

/* ---------- 标签页 ---------- */
async function renderTagsPage() {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag') || '';

  const [tagMap, allArticles] = await Promise.all([
    fetchTagIndex(),
    fetchArticles()
  ]);
  let contentHTML = '';

  if (tag && tagMap[tag]) {
    const tagData = tagMap[tag];
    const articles = tagData.articles;
    contentHTML = `
      <h2 class="Headline">标签: ${escapeHtml(tag)} (${articles.length} 篇文章)</h2>
      <div class="BlurbListing">${articles.map(articleListingHTML).join('\n')}</div>
      <p><a href="tags.html">&lt;-- 返回所有标签</a></p>
    `;
  } else {
    const tagCloud = Object.entries(tagMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([t, data]) => {
        const size = Math.min(2.5, 1 + data.count * 0.2);
        return `<span class="tag-cloud-item"><a href="tags.html?tag=${t}" class="tag-badge" style="font-size:${size}em">${t} (${data.count})</a></span>`;
      }).join('');

    // 分类索引
    const catMap = {};
    allArticles.forEach(a => {
      if (!catMap[a.category]) catMap[a.category] = [];
      catMap[a.category].push(a);
    });
    const catList = Object.entries(catMap)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([c, articles]) => `
        <h3 class="SummaryHL"><a href="search.html?cats=${encodeURIComponent(c)}">${c}</a> (${articles.length})</h3>
        <div class="BlurbListing">${articles.slice(0, 3).map(articleListingHTML).join('\n')}</div>
      `).join('');

    contentHTML = `
      <h2 class="Headline">标签云</h2>
      <div class="BlurbListing" style="line-height:2.5">${tagCloud}</div>
      <h2 class="Headline">按分类浏览</h2>
      ${catList}
    `;
  }

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="PageHeadline"><h1>标签分类</h1></div>
    <div class="ArticleText"><main>${contentHTML}</main></div>
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent, [...new Set(allArticles.map(a => a.category))]);
}

/* ---------- 关于页 ---------- */
function renderAboutPage() {
  const aboutMarkdown = `## 关于 OSS Notes

**OSS Notes** 是一个读者支持的个人博客，致力于提供来自 Linux 和自由软件开发社区内部的观察与报道。

### 站点理念

本站的设计灵感来源于 [LWN.net](https://lwn.net/)，一个在 Linux 和开源社区中享有盛誉的新闻站点。我们采用与其相同的设计风格——简洁、实用、内容优先。

### 内容范围

| 分类 | 说明 |
|------|------|
| Kernel | Linux 内核开发、补丁、版本发布 |
| Security | 安全漏洞、安全更新、安全公告 |
| Development | 开发工具、编程语言、开发实践 |
| Distributions | 各大 Linux 发行版的动态 |
| Briefs | 社区简讯和短消息 |
| Announcements | 公告、会议、活动 |

### Markdown 支持

所有文章正文均使用 Markdown 编写，支持标题、列表、引用、代码块、表格等。

### 写作入口

本站提供独立的<a href="admin.html">写作入口</a>，支持 Markdown 实时预览编辑。

### 关于设计

一比一复刻 LWN.net 视觉设计：左侧固定导航栏、桃色标题栏、深蓝链接、衬线字体正文、响应式布局。

### 联系方式<a name="contact"></a>

如有建议或投稿意向，欢迎联系。

> "News from the source" — 这是我们的信条。`;

  const mainContent = `
<div class="maincolumn flexcol">
  <div class="middlecolumn">
    <div class="PageHeadline"><h1>关于 OSS Notes</h1></div>
    <div class="ArticleText"><main>
      <div class="markdown-body">${renderMarkdown(aboutMarkdown)}</div>
    </main></div>
  </div>
  <div class="rightcol not-print"></div>
</div>
  `;
  renderLayout(mainContent);
}

/* ---------- 工具函数 ---------- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = escapeHtml(query);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return escaped.replace(re, '<span class="SearchMatch">$1</span>');
}

/* ---------- 页面路由 ---------- */
async function init() {
  const page = document.body.getAttribute('data-page');
  try {
    switch (page) {
      case 'home':    await renderHomePage(); break;
      case 'article': await renderArticlePage(); break;
      case 'search':  await renderSearchPage(); break;
      case 'tags':    await renderTagsPage(); break;
      case 'about':   renderAboutPage(); break;
      default:        await renderHomePage();
    }
  } catch (e) {
    console.error('渲染失败:', e);
    renderLayout(`
      <div class="maincolumn flexcol"><div class="middlecolumn">
        <div class="PageHeadline"><h1>加载失败</h1></div>
        <div class="ArticleText"><main>
          <p>页面加载出错：${escapeHtml(e.message)}</p>
          <p>请确认后端服务器正在运行（<code>node server.js</code>）。</p>
        </main></div>
      </div><div class="rightcol not-print"></div></div>
    `);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
