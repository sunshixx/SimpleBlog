/**
 * OSS Notes 写作入口 — 精简版
 * 右上角按钮进来，选分类写正文，存数据库
 */

if (typeof marked !== 'undefined') marked.setOptions({ breaks:true, gfm:true });

/* ---------- 认证 ---------- */
let TOKEN = localStorage.getItem('oss_token') || '';
const isAuthed = () => !!TOKEN;

async function login(pwd) {
  const r = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwd})});
  const d = await r.json();
  if (d.ok) { TOKEN=d.token; localStorage.setItem('oss_token',TOKEN); return true; }
  return false;
}
const authH = () => ({'Content-Type':'application/json','Authorization':'Bearer '+TOKEN});
const authHNoCT = () => ({'Authorization':'Bearer '+TOKEN});

/* ---------- API ---------- */
// 全局 fetch 包装：401 时跳回登录
function authedFetch(url, opts) {
  return fetch(url, opts).then(r => {
    if (r.status === 401) {
      // token 失效，清掉让用户重新登录
      TOKEN = ''; localStorage.removeItem('oss_token');
      location.reload();
      throw new Error('未授权');
    }
    return r;
  });
}
const api = {
  list: () => fetch('/api/articles').then(r=>r.json()),
  get:  id => fetch('/api/articles/'+id).then(r=>r.json()),
  save: (data,id) => authedFetch(id?'/api/articles/'+id:'/api/articles',{method:id?'PUT':'POST',headers:authH(),body:JSON.stringify(data)}).then(r=>r.json()),
  del:  id => authedFetch('/api/articles/'+id,{method:'DELETE',headers:authH()}).then(r=>r.json()),
  // 图片库
  picList:   () => fetch('/api/pictures').then(r=>r.json()),
  picUpload: fd => authedFetch('/api/pictures',{method:'POST',headers:authHNoCT(),body:fd}).then(r=>r.json()),
  picDel:    name => authedFetch('/api/pictures/'+encodeURIComponent(name),{method:'DELETE',headers:authH()}).then(r=>r.json()),
  // 评论管理
  commentList:  aid => fetch('/api/articles/'+aid+'/comments').then(r=>r.json()),
  commentDel:   (aid,cid) => authedFetch('/api/articles/'+aid+'/comments/'+cid,{method:'DELETE',headers:authH()}).then(r=>r.json())
};

/* ---------- 页面骨架 ---------- */
function shell(inner) {
  document.body.innerHTML = `
<div id="menu">
  <a href="index.html"><span class="logo">OSS<br>.Notes</span></a>
  <div class="navmenu-container"><ul class="navmenu">
    <li><a class="navmenu" href="admin.html"><b>写作</b></a></li>
  </ul></div>
</div>
<div class="topnav-spacer"></div>
<div class="topnav-container">
  <a href="index.html"><b>← 返回博客</b></a> |
  <a href="#" id="logout"><b>退出</b></a>
</div>
${inner}
<br clear="all"><center><span class="ReallySmall">OSS Notes · 写作入口</span></center>`;
  const lo = document.getElementById('logout');
  if (lo) lo.addEventListener('click', e=>{e.preventDefault();TOKEN='';localStorage.removeItem('oss_token');location.reload();});
}

/* ---------- 登录页 ---------- */
function showLogin() {
  shell(`
<div class="maincolumn flexcol"><div class="middlecolumn">
  <div class="PageHeadline"><h1>写作入口</h1></div>
  <div class="ArticleText">
    <div class="login-box">
      <p><b>请输入管理密码</b></p>
      <input type="password" id="pwd" placeholder="密码" autofocus
             onkeydown="if(event.key==='Enter')document.getElementById('go').click()">
      <button class="btn" id="go">进入</button>
      <div id="emsg"></div>
    </div>
  </div>
</div></div>
  `);
  document.getElementById('go').addEventListener('click', async ()=>{
    if (await login(document.getElementById('pwd').value)) location.reload();
    else document.getElementById('emsg').innerHTML='<div class="msg err">密码错误</div>';
  });
}

/* ---------- 编辑页 ---------- */
async function showEditor() {
  shell(`
<div class="maincolumn flexcol"><div class="middlecolumn">
  <div class="PageHeadline"><h1>写文章</h1></div>
  <div class="ArticleText editor-page">
    <div id="flash"></div>
    <div class="editor-form">
      <label>标题</label>
      <input type="text" id="title" placeholder="文章标题">

      <div class="row2">
        <div>
          <label>大类（方便索引）</label>
          <select id="category" style="width:100%;padding:6px;font-size:medium;border-radius:0.5em;border:1px solid var(--FormBG);box-sizing:border-box;">
            <option>Kernel</option>
            <option>Security</option>
            <option>Development</option>
            <option>Distributions</option>
            <option>Briefs</option>
            <option>Announcements</option>
          </select>
        </div>
        <div>
          <label>作者</label>
          <input type="text" id="author" value="admin">
        </div>
        <div>
          <label>[$] 订阅标记</label>
          <select id="subscription" style="width:100%;padding:6px;font-size:medium;border-radius:0.5em;border:1px solid var(--FormBG);box-sizing:border-box;">
            <option value="false">否</option>
            <option value="true">是</option>
          </select>
        </div>
      </div>

      <label>标签（逗号分隔，方便索引）</label>
      <input type="text" id="tags" placeholder="kernel, release, linux">

      <label>摘要（显示在列表页）</label>
      <input type="text" id="summary" placeholder="一句话摘要">

      <label>正文（Markdown）</label>
      <div class="insert-toolbar">
        <input type="file" id="insertFile" accept="image/*" multiple style="display:none">
        <input type="button" id="insertPicBtn" value="插入图片">
        <input type="text" id="insertPath" value="picture" size="14" title="上传图片保存路径">
        <span class="Smaller">粘贴板图片自动进 <code>picture/</code>；本地上传按上面路径；发布时后台会把所有非 picture/ 的引用归档到 picture/。</span>
        <span id="insertMsg" class="Smaller" style="margin-left:0.4em"></span>
      </div>
      <div class="editor-split">
        <div>
          <div class="preview-label">编辑器</div>
          <textarea id="content" placeholder="在此输入 Markdown 正文... 可直接 Ctrl+V 粘贴图片，Ctrl+Enter 发布"></textarea>
        </div>
        <div>
          <div class="preview-label">实时预览</div>
          <div class="preview-box markdown-body" id="preview"></div>
        </div>
      </div>

      <input type="hidden" id="editId" value="">
      <div class="btn-row">
        <button class="btn" id="publish">发布文章</button>
        <button class="btn" id="clear">清空</button>
        <span id="saved"></span>
      </div>
    </div>

    <h2 class="Headline" style="margin-top:2em;">已发布文章</h2>
    <div id="alist"></div>

  </div>
</div></div>
  `);

  // 实时预览（含数学公式）
  const ta = document.getElementById('content');
  const pv = document.getElementById('preview');
  const renderPreview = () => {
    // 编辑器内预览也走一遍 picture 路径重写（与正文页一致）
    const md = ta.value || '*预览区为空*';
    const rewritten = md
      .replace(/!\[([^\]]*)\]\((\.?\/)?picture\/([^)]+)\)/g, '![$1](/picture/$3)')
      .replace(/(<img\s+[^>]*?src=["'])(\.?\/)?picture\/([^"']+)(["'][^>]*?>)/g, '$1/picture/$3$4');
    pv.innerHTML = marked.parse(rewritten);
    // 渲染数学公式
    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(pv, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$',  right: '$',  display: false }
        ],
        throwOnError: false
      });
    }
  };
  ta.addEventListener('input', renderPreview);

  // 粘贴板支持：Ctrl+V 粘贴图片直接进 picture/ 并在光标处插入引用
  ta.addEventListener('paste', handlePaste);

  // 插入图片按钮：点按钮触发文件选择，选完自动上传+插入
  const insertBtn = document.getElementById('insertPicBtn');
  const insertFile = document.getElementById('insertFile');
  const insertPath = document.getElementById('insertPath');
  insertBtn.addEventListener('click', () => insertFile.click());
  insertFile.addEventListener('change', handleInsertFiles);

  // 发布
  document.getElementById('publish').addEventListener('click', doPublish);
  document.getElementById('clear').addEventListener('click', clearForm);

  // 未保存修改提示 + 自动 resize + Ctrl+Enter 发布 + 作者记忆
  setupFormGuards(ta);

  await loadList();
}

/* ---------- 表单守卫：未保存提示、自动 resize、Ctrl+Enter、作者记忆 ---------- */
let isDirty = false;        // 是否有未保存修改
let beforeUnloadHandler = null;
let formFieldHandlers = []; // 字段监听器引用，避免重复绑定

function markDirty(on) {
  isDirty = !!on;
  document.title = (isDirty ? '● ' : '') + '写作 - OSS Notes';
  // 已发布文章列表里高亮正在编辑的那篇
  document.querySelectorAll('.list-item').forEach(el => el.classList.remove('editing'));
  const id = document.getElementById('editId') && document.getElementById('editId').value;
  if (id) {
    const cur = document.querySelector('.list-item[data-id="'+id+'"]');
    if (cur) {
      cur.classList.add('editing');
      cur.classList.toggle('editing-dirty', isDirty);
    }
  }
}

function setupFormGuards(ta) {
  // 解绑旧的（防止重复绑定）
  formFieldHandlers.forEach(({el, ev, fn}) => el.removeEventListener(ev, fn));
  formFieldHandlers = [];

  // 任何表单字段变化都标 dirty
  const fields = ['title','category','author','subscription','tags','summary','content'];
  fields.forEach(name => {
    const el = document.getElementById(name);
    if (!el) return;
    const handler = () => markDirty(true);
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
    formFieldHandlers.push({el, ev: 'input', fn: handler});
    formFieldHandlers.push({el, ev: 'change', fn: handler});
  });

  // 自动 resize textarea
  function autoResize() {
    ta.style.height = 'auto';
    ta.style.height = Math.min(800, Math.max(320, ta.scrollHeight + 4)) + 'px';
  }
  ta.addEventListener('input', autoResize);
  formFieldHandlers.push({el: ta, ev: 'input', fn: autoResize});
  autoResize();

  // Ctrl+Enter 发布
  const keyHandler = e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      doPublish();
    }
  };
  ta.addEventListener('keydown', keyHandler);
  formFieldHandlers.push({el: ta, ev: 'keydown', fn: keyHandler});

  // 作者记忆
  const authorEl = document.getElementById('author');
  const lastAuthor = localStorage.getItem('oss_last_author');
  if (lastAuthor && (!authorEl.value || authorEl.value === 'admin')) {
    authorEl.value = lastAuthor;
  }
  const authorHandler = () => {
    if (authorEl.value.trim()) localStorage.setItem('oss_last_author', authorEl.value.trim());
  };
  authorEl.addEventListener('change', authorHandler);
  formFieldHandlers.push({el: authorEl, ev: 'change', fn: authorHandler});

  // 离开页面前 confirm（防未保存丢失）
  if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler);
  beforeUnloadHandler = e => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '有未保存的修改，确定离开吗？';
      return e.returnValue;
    }
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  // 进入时先清一次 dirty
  markDirty(false);
}

function clearForm() {
  if (isDirty && !confirm('当前有未保存的修改，确定要清空吗？')) return;
  // 解绑旧的 beforeunload，由 setupFormGuards 重新绑定
  if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler);

  document.getElementById('editId').value='';
  document.getElementById('title').value='';
  document.getElementById('category').value='Kernel';
  // 作者记忆：恢复上次的作者
  document.getElementById('author').value = localStorage.getItem('oss_last_author') || 'admin';
  document.getElementById('subscription').value='false';
  document.getElementById('tags').value='';
  document.getElementById('summary').value='';
  const ta = document.getElementById('content');
  ta.value=''; ta.dispatchEvent(new Event('input'));
  // 重置防重复指纹历史
  lastFp = '';
  lastPublishedAt = 0;
  // 按钮文案回到"发布"
  const btn = document.getElementById('publish');
  btn.textContent = '发布文章';
  btn.disabled = false;
  // 重新设置守卫（清空后重新监听）
  setupFormGuards(ta);
  flash('已清空','ok');
}

/* ---------- 发布/保存（带防重复提交） ---------- */
let isPublishing = false;
let lastPublishedAt = 0;
let lastFp = '';

async function doPublish() {
  // 防重复锁：上一次发布未结束则忽略
  if (isPublishing) {
    flash('正在保存中，请勿重复点击...', 'err');
    return;
  }

  const id = document.getElementById('editId').value;
  const data = {
    title: document.getElementById('title').value,
    category: document.getElementById('category').value,
    author: document.getElementById('author').value,
    subscription: document.getElementById('subscription').value==='true',
    tags: document.getElementById('tags').value.split(',').map(s=>s.trim()).filter(Boolean),
    summary: document.getElementById('summary').value,
    content: document.getElementById('content').value
  };
  if (!data.title || !data.content) { flash('标题和正文不能为空','err'); return; }
  if (!data.author.trim()) { flash('作者不能为空','err'); return; }

  // 前端额外保险：仅【新建模式】下做 5 秒同内容指纹拦截；编辑模式跳过
  const fp = (data.title+'|'+data.content).slice(0, 200);
  const now = Date.now();
  if (!id && now - lastPublishedAt < 5000 && lastFp === fp) {
    flash('刚刚已发布相同内容，请稍后再试', 'err');
    return;
  }

  isPublishing = true;
  const btn = document.getElementById('publish');
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = id ? '保存中...' : '发布中...';

  try {
    const r = await api.save(data, id||null);
    if (r && r._duplicate) {
      // 后端命中防重复：返回的是已有文章，前端只提示，不动表单
      flash('检测到重复内容，已忽略（已有 #'+r.id+'）', 'err');
    } else {
      // 记住作者
      if (data.author.trim()) localStorage.setItem('oss_last_author', data.author.trim());
      flash(id ? '已更新！ID='+(r?.id||id) : '已发布！ID='+r.id, 'ok');
      // 重置表单到"新建"状态
      document.getElementById('editId').value='';
      document.getElementById('title').value='';
      document.getElementById('tags').value='';
      document.getElementById('summary').value='';
      document.getElementById('content').value='';
      document.getElementById('preview').innerHTML='*预览区为空*';
      document.getElementById('content').dispatchEvent(new Event('input')); // 触发 autoResize
      btn.textContent = '发布文章';  // 按钮回到新建文案
      // 仅新建模式记录指纹（编辑模式更新成功不记录，避免下次编辑被误杀）
      if (!id) {
        lastPublishedAt = Date.now();
        lastFp = fp;
      } else {
        // 编辑完成回到新建模式，清掉指纹历史
        lastPublishedAt = 0;
        lastFp = '';
      }
      await loadList();
      markDirty(false);
    }
  } catch(e) {
    flash('保存失败：'+e.message, 'err');
  } finally {
    isPublishing = false;
    btn.disabled = false;
    // finally 不要粗暴覆盖 textContent（成功路径已正确设置）
    if (!btn.textContent || btn.textContent === '保存中...' || btn.textContent === '发布中...') {
      btn.textContent = document.getElementById('editId').value ? ('更新文章 #'+document.getElementById('editId').value) : '发布文章';
    }
  }
}

/* ---------- 文章列表（编辑/删除） ---------- */
async function loadList() {
  const el = document.getElementById('alist');
  el.innerHTML='<p>加载中...</p>';
  const list = await api.list();
  if (!list.length) { el.innerHTML='<p>暂无文章。</p>'; return; }
  el.innerHTML = list.map(a=>`
    <div class="list-item" data-id="${a.id}">
      <div>
        <b>[${
          a.id}] ${esc(a.title)}</b>
        <span class="Smaller">[${a.category}] ${a.date} by ${a.author} · 评论 ${a.comments||0}</span>
      </div>
      <div class="act">
        <a href="#" onclick="editArt(${a.id});return false">编辑</a>
        <a href="article.html?id=${a.id}" target="_blank">查看</a>
        <a href="#" onclick="toggleComments(${a.id}, this);return false">评论</a>
        <a href="#" onclick="delArt(${a.id});return false" style="color:red">删除</a>
      </div>
      <div class="comment-mgr" id="cmt-mgr-${a.id}" style="display:none"></div>
    </div>`).join('');
  // 当前编辑项高亮
  const curId = document.getElementById('editId').value;
  if (curId) {
    const cur = document.querySelector('.list-item[data-id="'+curId+'"]');
    if (cur) {
      cur.classList.add('editing');
      cur.classList.toggle('editing-dirty', isDirty);
    }
  }
}

async function editArt(id) {
  // 切换前 if dirty 提示
  const curId = document.getElementById('editId').value;
  if (isDirty && curId && curId !== String(id)) {
    if (!confirm('当前有未保存的修改，切换到其他文章会丢失。确定切换吗？')) return;
  } else if (isDirty && !curId) {
    if (!confirm('当前有未保存的修改，切换到编辑模式会丢弃。确定切换吗？')) return;
  }
  const a = await api.get(id);
  document.getElementById('editId').value=a.id;
  document.getElementById('title').value=a.title;
  document.getElementById('category').value=a.category;
  document.getElementById('author').value=a.author;
  document.getElementById('subscription').value=String(a.subscription);
  document.getElementById('tags').value=(a.tags||[]).join(', ');
  document.getElementById('summary').value=a.summary||'';
  document.getElementById('content').value=a.content||'';
  // 重新触发预览（含 picture 路径重写 + autoResize）
  document.getElementById('content').dispatchEvent(new Event('input'));
  // 编辑模式：按钮文案明确表示是更新哪篇
  document.getElementById('publish').textContent = '更新文章 #'+id;
  // 编辑模式下重置防重复指纹历史，避免保存时被前端误杀
  lastFp = '';
  lastPublishedAt = 0;
  markDirty(false);
  flash('正在编辑 #'+id,'ok');
  window.scrollTo(0,0);
}

async function delArt(id) {
  if(!confirm('确定删除这篇文章吗？\n注意：对应的评论也会一并清理。')) return;
  await api.del(id);
  // 如果正在编辑的就是这篇，强制清空表单（不弹未保存确认，因为用户已经确认删除）
  if (document.getElementById('editId').value === String(id)) {
    forceClearForm();
  }
  flash('已删除','ok');
  await loadList();
}

function forceClearForm() {
  document.getElementById('editId').value='';
  document.getElementById('title').value='';
  document.getElementById('category').value='Kernel';
  document.getElementById('author').value = localStorage.getItem('oss_last_author') || 'admin';
  document.getElementById('subscription').value='false';
  document.getElementById('tags').value='';
  document.getElementById('summary').value='';
  const ta = document.getElementById('content');
  ta.value=''; ta.dispatchEvent(new Event('input'));
  lastFp = ''; lastPublishedAt = 0;
  const btn = document.getElementById('publish');
  btn.textContent = '发布文章'; btn.disabled = false;
  markDirty(false);
}

/* ---------- 评论管理（admin 端） ---------- */
async function toggleComments(id, linkEl) {
  const box = document.getElementById('cmt-mgr-' + id);
  if (!box) return;
  if (box.style.display !== 'none' && box.innerHTML) {
    box.style.display = 'none';
    linkEl.textContent = '评论';
    return;
  }
  linkEl.textContent = '收起评论';
  box.style.display = 'block';
  box.innerHTML = '<p class="pic-hint">加载中...</p>';
  const list = await api.commentList(id);
  if (!list.length) {
    box.innerHTML = '<p class="pic-hint"><i>暂无评论。</i></p>';
    return;
  }
  box.innerHTML = list.map(c => `
    <div class="comment-mgr-item" data-cid="${c.id}">
      <div>
        <b>${esc(c.author)}</b>
        <span class="Smaller">${esc(c.date)} ${esc(c.time)}</span>
        <a href="#" onclick="delCmt(${id}, ${c.id});return false" style="color:#a44;float:right">删除</a>
      </div>
      <div class="comment-mgr-body">${esc(c.content)}</div>
    </div>
  `).join('');
}

async function delCmt(articleId, commentId) {
  if (!confirm('确定删除这条评论吗？')) return;
  const r = await api.commentDel(articleId, commentId);
  if (r.ok) {
    flash('已删除评论','ok');
    // 局部刷新评论区
    const linkEl = document.querySelector(`.list-item[data-id="${articleId}"] .act a[onclick*="toggleComments"]`);
    if (linkEl) await toggleComments(articleId, linkEl);
    await loadList(); // 刷新评论数
  } else {
    flash('删除失败：' + (r.error || ''), 'err');
  }
}

/* ---------- 工具 ---------- */
function flash(m,t) {
  const f = document.getElementById('flash');
  if (!f) return;
  f.innerHTML=`<div class="msg ${t}">${m}</div>`;
  setTimeout(()=>{ if (f) f.innerHTML=''; },4000);
}
function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ---------- 图片：粘贴 + 插入图片按钮 ---------- */

// 粘贴板：检测图片直接进 picture/
async function handlePaste(e) {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  const ta = e.target;
  for (const it of items) {
    if (it.kind === 'file' && it.type && it.type.startsWith('image/')) {
      const file = it.getAsFile();
      if (!file) continue;
      e.preventDefault(); // 阻止默认粘贴行为（避免把图当二进制塞进去）
      // 粘贴永远进 picture/
      const ext = (file.name.match(/\.[a-zA-Z0-9]+$/) || ['.' + (file.type.split('/')[1] || 'png')])[0];
      const name = 'paste-' + Date.now() + ext;
      setInsertMsg('粘贴上传中...', 'info');
      const r = await uploadOne(file, name, 'picture');
      if (r && r.ref) {
        insertMarkdownAtCursor(ta, `![${r.name.replace(/\.[^.]+$/, '')}](${r.ref})\n`);
        setInsertMsg('已粘贴：' + r.name, 'ok');
      } else {
        setInsertMsg('粘贴失败：' + (r && r.error || '未知错误'), 'err');
      }
    }
  }
}

// "插入图片" 按钮：选完文件后自动上传 + 插入
async function handleInsertFiles(e) {
  const files = e.target.files;
  if (!files || !files.length) return;
  const ta = document.getElementById('content');
  const targetDir = (document.getElementById('insertPath').value || 'picture').trim() || 'picture';
  setInsertMsg('上传中...', 'info');
  let ok = 0, fail = 0;
  for (const f of Array.from(files)) {
    const r = await uploadOne(f, f.name, targetDir);
    if (r && r.ref) {
      ok++;
      insertMarkdownAtCursor(ta, `![${f.name.replace(/\.[^.]+$/, '')}](${r.ref})\n`);
    } else { fail++; }
  }
  e.target.value = ''; // 清空以便下次选同名文件
  setInsertMsg((ok ? '已插入 ' + ok + ' 张' : '失败') + (fail ? '（' + fail + ' 张失败）' : ''),
               ok && !fail ? 'ok' : (ok ? 'info' : 'err'));
}

// 通用：上传一张图到指定路径
async function uploadOne(file, fileName, path) {
  const fd = new FormData();
  fd.append('file', file, fileName);
  fd.append('path', path);
  try {
    return await api.picUpload(fd);
  } catch (e) {
    return { error: e.message };
  }
}

function setInsertMsg(text, type) {
  const el = document.getElementById('insertMsg');
  if (!el) return;
  // 朴素 LWN 风格：var(--VLinkColor) 灰色文字，不用绿底/红底
  el.textContent = text || '';
  el.style.color = type === 'err' ? '#a44'
                  : type === 'ok'  ? '#393'
                  : 'var(--VLinkColor)';
}

// 在 textarea 当前光标处插入文本，并触发预览刷新
function insertMarkdownAtCursor(ta, text) {
  if (!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  // 在选中处插入，光标后留一个换行更友好
  const ins = (before && !before.endsWith('\n')) ? '\n' + text : text;
  ta.value = before + ins + after;
  const pos = (before + ins).length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event('input'));
}

/* ---------- 启动 ---------- */
if (isAuthed()) showEditor(); else showLogin();
