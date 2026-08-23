# SUN Notes

一个记录个人学习、开源代码阅读、项目实践和技术思考的个人博客。

## 环境要求

- Node.js 18 或更高版本
- 不需要 `npm install`
- 不需要数据库服务
- 不需要构建工具

## 启动
ƒ
在项目目录执行：

```powershell
node server.js
```

浏览：`http://localhost:8088/`

后台写作：`http://localhost:8088/admin.html`

登陆页面：
<img width="1280" height="744" alt="image" src="https://github.com/user-attachments/assets/5610fc95-eb06-4273-8287-f5ebc64cc764" />
浏览页面：
<img width="1280" height="744" alt="image" src="https://github.com/user-attachments/assets/270cae20-0404-4eb0-8bb6-a1f22eb290c0" />
写作页面：

<img width="625" height="623" alt="image" src="https://github.com/user-attachments/assets/75a587d5-1758-4671-9623-da960acc20fe" />


## 中英文切换

站点支持中文 / English 双语切换：

- 页面右上角（或手机端导航栏）有语言切换按钮，点击即时切换，无需刷新
- 语言偏好保存在浏览器 `localStorage`，下次访问自动沿用
- 覆盖导航、首页、搜索、标签、关于、文章详情、写作入口等全部界面文案
- 侧边栏分类名也会随语言切换（数据存储与 URL 参数仍使用中文，仅显示层翻译）

如需添加新的界面文案，在 `js/i18n.js` 的 `en` 字典中补充对应条目即可；`t()` 在未找到翻译时会回退显示中文原文。

## 权限模型

这是个人博客，没有统一用户系统：

- 首页、搜索、标签、关于、文章详情：公开访问
- 评论查看和发表评论：公开访问
- 发布、编辑、删除文章：需要管理员密码登录
- 图片上传和删除：需要管理员登录
- 评论隐藏、恢复、删除：需要管理员登录

管理员登录只保护写作和管理入口，不会阻止读者查看文章。

## 数据结构

```text
db/
  config.json          管理员密码配置
  articles/*.md       每篇文章一个 Markdown 文件
  comments/*.json     每篇文章一个评论文件
picture/              已归档图片
css/                  样式和图片资源
js/                   页面逻辑、i18n 字典和 Markdown 渲染库
```

文章正文中的非 `picture/` 本地图片引用，在发布时会被复制到 `picture/` 并重写引用。源文件不会被移动。

## 写作流程

1. 打开 `admin.html` 并输入管理员密码。
2. 填写标题、分类、作者、摘要和正文。
3. 编辑器支持 Markdown 实时预览、数学公式、图片粘贴和图片上传。
4. markdown格式支持补全功能。
5. 代码块内支持代码高亮以及代码补全功能。
6. 草稿会自动保存到浏览器本地存储，也可以手动点击“保存草稿”。
7. 点击“预览文章”检查最终效果。
8. 点击“发布文章”写入 `db/articles/{id}.md`。

草稿只保存在当前浏览器，不会出现在公开首页，也不会写入服务器。

## 备份与迁移

备份以下目录和文件：

```text
db/articles/
db/comments/
picture/
db/config.json
```

换机器时：

1. 安装 Node.js 18+。
2. 复制整个项目目录。
3. 检查 `db/config.json` 或设置 `SUN_ADMIN_PASSWORD`。
4. 在项目目录执行 `node server.js`。
5. 打开 `http://localhost:8088/`。

## 常见问题

### 8088 端口被占用

Windows：

```powershell
Get-NetTCPConnection -LocalPort 8088 -State Listen
Stop-Process -Id <PID> -Force
node server.js
```

Linux/macOS：

```bash
lsof -i :8088
kill <PID>
node server.js
```

### 修改 Markdown 后页面没有变化

服务器会在文章读取接口前重新扫描 `db/articles/`。刷新页面即可；若刚修改了 `server.js`，需要重启 Node 进程。

### 管理员登录失效
每次进入写作页面都需要强制进行管理员鉴权操作。一旦登陆成功，管理员 token 默认有效 12 小时。失效后重新打开 `admin.html` 登录即可。

## 开发检查

```powershell
node --check server.js
node --check js/app.js
node --check js/admin.js
```

项目使用 Node.js 内置模块和浏览器原生 API，当前没有 npm 依赖。
