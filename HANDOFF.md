# 项目交接 · 新对话从这里开始

最后更新：2026-10-20（Asia/Shanghai）。本文件只保留当前状态，历史细节见 [CHANGELOG.md](CHANGELOG.md)。

## 必读顺序

1. [项目工作规范](AGENTS.md)。用户要求：**每次更新后新增一篇中文更新日志，并同步本交接说明。**
2. [最近一轮：更新日志机制](docs/updates/2026-10-20-02-update-workflow.md)。本轮只改文档，没有新 APK。
3. [最近功能更新：安卓交互修复](docs/updates/2026-10-20-01-android-ui.md)，以及 [移动交互实现说明](docs/MOBILE-UI.md)。
4. 运行 `git status --short --branch`、`git log -5 --oneline`，以实际工作区和远端状态为准。

## 当前可用版本

- 项目目录：`E:\workplace\英语单词系统`。
- GitHub 公开库：[SathRose/wordforge-local](https://github.com/SathRose/wordforge-local)，分支 `main`。
- 当前 APK：`1.1.1-local.3`，versionCode `3`，包名 `com.wordforge.local`，最低 Android 8.0。
- 本地安装包：`releases/词匠-本地版-1.1.1-local.3.apk`。
- [正式 APK 下载](https://github.com/SathRose/wordforge-local/releases/download/v1.1.1-local.3/WordForge-1.1.1-local.3.apk)；[发布页面](https://github.com/SathRose/wordforge-local/releases/tag/v1.1.1-local.3)。
- APK SHA-256：`b901132b852e0aa0b11d806664488832730432fa1d115f3b0837a843ada36457`。
- 功能实现提交 `804d8b5`；发布校验和提交 `08efafb`；功能标签 `v1.1.1-local.3`；修改前基线 `baseline-local-20261020`。
- 电脑入口：`http://127.0.0.1:8765/`，启动/关闭脚本见根目录。服务启停不会清空浏览器数据；实际运行状态需重新检查。

## 已完成，不要当作待办重复重做

- 初始化本地 Git、建立公开仓库并推送；排除签名、私人学习备份与原始截图。
- 手机首页开始学习进入首屏，统计两列显示，长词书名不再挤坏标题。
- 学习提供上一张、跳过、保存评价并下一张；保留原评分和撤销语义，修复总结及拼写评分绑定。
- 修复从首页进入精读时事件未挂载；支持点词底部抽屉、辅助档位、字号、阅读位置恢复和导入草稿保留。
- Android 返回键按栈逐层返回，底部导航避让系统栏和软键盘；停止朗读会取消分段任务。
- 电脑本地服务已在该次功能更新后重启；新旧 APK 签名一致，并完成覆盖安装后的数据保留检查。

## 最近功能版本的验证证据

- 逻辑 718 项、课本导入 10 项、词达人导入 16 项、词书排序 14 项通过。
- 七种尺寸的浏览器交互 210 项通过，APK 内置 HTML 也执行了该套检查。
- API 36 模拟器原生检查 15 项通过，含真实触控、返回键、键盘与重载持久化。
- 结构检查 0 错误，保留上游已有的 1 项模板计数提示。
- 本机原始结果在被 Git 忽略的 `test-results/`；可复现脚本在 `checks/`。上述是上一轮结果，不代表今后的改动自动通过。

## 尚未完成 / 优先下一步

1. **等待用户在 iQOO Neo9 上反馈新版 APK 的实际体验。** 用户报告 Android 12 / 橘子 6，尚未连接或核实真机系统信息。
2. 如继续兼容性验证，可补装 API 31 / Android 12 镜像；上一轮下载损坏未安装成功，**不能声称已通过 Android 12 模拟器或真机验收**。现有 API 34/36 并不陈旧，不需为这次任务重装。
3. 依据真机截图、操作路径和屏幕/字体设置复现剩余问题，优先检查首页、精读、系统返回与键盘。没有反馈时不要编造新的故障。
4. 新闻源在具体手机网络下的可达性未全面验收；目前交互测试使用隔离文本，网络问题与布局问题要分开定位。

## 构建与数据注意事项

- `wordforge.html` 是主应用，`android/build-apk.cjs` 打包该文件，不要误改上游缓存或历史备份。
- 核心测试、外部 Playwright 配置、原生 QA 测试命令见 [README](README.md) 和 [移动端说明](docs/MOBILE-UI.md)。不要运行会改数据的原生回归脚本到真实手机上。
- `android/signing/` 中的现有签名只在本机保存，绝不上传；覆盖更新不能另换签名。用户安装前先导出完整备份，不要卸载旧版。
- 电脑与 APK 数据独立；固定浏览器来源不变，不能用清库方式“修复”显示问题。
- APK 已上传 Release；电脑版 HTML 已在仓库，单独的 HTML Release 附件曾上传超时，不应假定存在。

## 可直接发给新对话的一句话

> 请先阅读本项目 AGENTS.md、HANDOFF.md、CHANGELOG.md 和其中最近的功能更新日志，检查 Git 现场后继续。当前 APK 为 1.1.1-local.3；优先依据我的 iQOO Neo9 真机反馈处理首页与美文精读问题。每轮完成后新增更新日志并更新交接说明。
