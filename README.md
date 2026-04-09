# OpenClaw MD Builder

一个用于生成 OpenClaw Agent 工作区配置的前端工具。

## 定位

- 输入：UI 配置
- 中间层：JSON 配置结构
- 输出：OpenClaw 兼容的 `workspace/*.md` 配置包

本项目当前模式：`直接读取 workspace -> 修改配置 -> 保存回写`。

## MVP 功能

- 人格配置（SOUL）
- 能力与规则配置（AGENTS）
- 工具开关配置（TOOLS）
- 身份配置（IDENTITY）
- 预设模板库（大类 + 细分类型，一键应用）
- 选项池随类型切换（人格/技能/规则/工具推荐动态变化）
- 自定义人格/指令/技能/规则/工具
- 实时 Markdown 预览
- 自动读取 workspace 下全部 `.md` 文件
- 左侧快捷编辑 + 右侧手动编辑（同文件同步）
- 保存当前文件到 workspace
- 版本管理：立即备份、版本列表、恢复备份
- 网关操作：重启 OpenClaw 网关（二次确认弹窗）

## 当前内置预设大类

- 自动化
- 商业与销售
- 合规
- 创意内容
- 客户成功
- 数据分析
- 软件开发
- 运维与可靠性
- 电商
- 教育学习
- 财务
- 自由职业
- 医疗健康
- 人力资源
- 法务
- 市场营销
- 社区增长
- 个人效率
- 生产力
- 房地产
- SaaS产品
- 安全
- 供应链
- 语音
- 执行控制精华（从 `Source/*.md` 提炼）

> 模板库由外部配置文件驱动，当前已整理 24 个大类、196 个细分模板。

## 文件结构

- `index.html`: 页面布局
- `styles.css`: 样式
- `app.js`: workspace 同步、编辑、备份与保存逻辑
- `data/preset-catalog.json`: 社区模板与来源索引（可直接编辑扩展）

## 运行

### 方式 1：Windows 一键启动（推荐）

直接双击：`start-app.bat`

等价命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-server.ps1 -Port 8787
```

### 方式 2：Linux 一键启动

```bash
chmod +x ./start-app.sh
./start-app.sh
```

### 方式 3：macOS 一键启动

直接双击：`start-app.command`

或命令行：

```bash
chmod +x ./start-app.sh ./start-app.command
./start-app.sh
```

### 方式 4：通用命令行启动

需要 Node.js 18+。

```bash
npm install
npm start
```

默认地址：`http://127.0.0.1:8787`

## 线上一键安装（多平台）

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Xiaowen1126/OpenClawMDBuilder/main/install-online.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/Xiaowen1126/OpenClawMDBuilder/main/install-online.ps1 | iex
```

可选参数（环境变量或脚本参数）：

```bash
REPO_URL=https://github.com/Xiaowen1126/OpenClawMDBuilder.git BRANCH=main INSTALL_DIR=/opt/OpenClawMDBuilder APP_PORT=8787 OPENCLAW_WORKSPACE=/root/.openclaw/workspace bash install-online.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File .\install-online.ps1 -RepoUrl https://github.com/Xiaowen1126/OpenClawMDBuilder.git -Branch main -InstallDir "$env:USERPROFILE\OpenClawMDBuilder" -Port 8787
```

## Linux 一键部署

```bash
chmod +x ./bootstrap-linux.sh
./bootstrap-linux.sh
```

脚本会自动：

- 安装 Node.js 18+（若未安装）
- 安装 npm 依赖
- 若存在 systemd：创建并启动 systemd 服务 `openclaw-md-builder`
- 若不存在 systemd（如容器）：自动使用 `nohup` 后台启动

可选环境变量：

```bash
APP_DIR=/opt/OpenClawMDBuilder APP_PORT=8787 OPENCLAW_WORKSPACE=/home/ubuntu/.openclaw/workspace ./bootstrap-linux.sh
```

## 一键打包发布

```bash
chmod +x ./package-release.sh
./package-release.sh
```

输出目录：`./dist`

- `OpenClawMDBuilder-<timestamp>.tar.gz`
- `OpenClawMDBuilder-<timestamp>.zip`（系统存在 `zip` 命令时）

可用环境变量：

- `OPENCLAW_WORKSPACE`：OpenClaw 工作区目录（默认 `~/.openclaw/workspace`）
- `OPENCLAW_BACKUP_DIR`：备份目录（默认 `<workspace>/.builder-backups`）
- `OPENCLAW_GATEWAY_RESTART_CMD`：重启网关命令（默认 `systemctl restart openclaw-gateway`）
- `PORT`：服务端口（默认 `8787`）

## 社区来源（已整理）

- GitHub: [awesome-openclaw-agents](https://github.com/mergisi/awesome-openclaw-agents)
- Reddit: [177 templates into 24 categories](https://www.reddit.com/r/openclaw/comments/1rzt9ba/i_organized_177_soulmd_templates_into_24/)
- Reddit: [Market Research Suite](https://www.reddit.com/r/openclaw/comments/1se2pux/new_5agent_market_research_suite_pack/)
- Reddit: [Reddit + News scout setup](https://www.reddit.com/r/openclaw/comments/1s2fg88/reddit_news_scout_setup_for_lead_research/)
- 博客: [OpenClaw 结构讲解](https://www.cnblogs.com/haifwu/articles/19107535)
- 博客: [OpenClaw 配置教程](https://blog.csdn.net/weixin_41641336/article/details/153418750)

## 显示说明

- 选项统一为 `English (中文)` 样式显示
- 不再提供独立语言切换开关
