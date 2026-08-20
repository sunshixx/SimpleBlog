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

/* ---------- API ---------- */
const api = {
  list: () => fetch('/api/articles').then(r=>r.json()),
  get:  id => fetch('/api/articles/'+id).then(r=>r.json()),
  save: (data,id) => fetch(id?'/api/articles/'+id:'/api/articles',{method:id?'PUT':'POST',headers:authH(),body:JSON.stringify(data)}).then(r=>r.json()),
  del:  id => fetch('/api/articles/'+id,{method:'DELETE',headers:authH()}).then(r=>r.json())
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
      <div class="editor-split">
        <div>
          <div class="preview-label">编辑器</div>
          <textarea id="content" placeholder="在此输入 Markdown 正文..."></textarea>
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

  // 实时预览
  const ta = document.getElementById('content');
  const pv = document.getElementById('preview');
  ta.addEventListener('input', ()=>{ pv.innerHTML = marked.parse(ta.value||'*预览区为空*'); });

  // 发布
  document.getElementById('publish').addEventListener('click', doPublish);
  document.getElementById('clear').addEventListener('click', ()=>{
    document.getElementById('editId').value='';
    document.getElementById('title').value='';
    document.getElementById('category').value='Kernel';
    document.getElementById('author').value='admin';
    document.getElementById('subscription').value='false';
    document.getElementById('tags').value='';
    document.getElementById('summary').value='';
    ta.value=''; pv.innerHTML='*预览区为空*';
    // 重置防重复指纹历史，避免清空后立刻再发同内容被拦
    lastFp = '';
    lastPublishedAt = 0;
    // 按钮文案回到"发布"
    document.getElementById('publish').textContent = '发布文章';
    flash('已清空','ok');
  });

  await loadList();
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
      flash(id ? '已更新！ID='+(r?.id||id) : '已发布！ID='+r.id, 'ok');
      // 重置表单到"新建"状态
      document.getElementById('editId').value='';
      document.getElementById('title').value='';
      document.getElementById('tags').value='';
      document.getElementById('summary').value='';
      document.getElementById('content').value='';
      document.getElementById('preview').innerHTML='*预览区为空*';
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
    <div class="list-item">
      <div>
        <b>[${
          a.id}] ${esc(a.title)}</b>
        <span class="Smaller">[${a.category}] ${a.date} by ${a.author}</span>
      </div>
      <div class="act">
        <a href="#" onclick="editArt(${a.id});return false">编辑</a>
        <a href="article.html?id=${a.id}" target="_blank">查看</a>
        <a href="#" onclick="delArt(${a.id});return false" style="color:red">删除</a>
      </div>
    </div>`).join('');
}

async function editArt(id) {
  const a = await api.get(id);
  document.getElementById('editId').value=a.id;
  document.getElementById('title').value=a.title;
  document.getElementById('category').value=a.category;
  document.getElementById('author').value=a.author;
  document.getElementById('subscription').value=String(a.subscription);
  document.getElementById('tags').value=(a.tags||[]).join(', ');
  document.getElementById('summary').value=a.summary||'';
  document.getElementById('content').value=a.content||'';
  document.getElementById('preview').innerHTML=marked.parse(a.content||'');
  // 编辑模式：按钮文案明确表示是更新哪篇
  document.getElementById('publish').textContent = '更新文章 #'+id;
  // 编辑模式下重置防重复指纹历史，避免保存时被前端误杀
  lastFp = '';
  lastPublishedAt = 0;
  flash('正在编辑 #'+id,'ok');
  window.scrollTo(0,0);
}

async function delArt(id) {
  if(!confirm('确定删除这篇文章吗？')) return;
  await api.del(id);
  flash('已删除','ok');
  await loadList();
}

/* ---------- 工具 ---------- */
function flash(m,t) {
  document.getElementById('flash').innerHTML=`<div class="msg ${t}">${m}</div>`;
  setTimeout(()=>{document.getElementById('flash').innerHTML='';},4000);
}
function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ---------- 启动 ---------- */
if (isAuthed()) showEditor(); else showLogin();
