# 项目交接 · 新对话从这里开始

最后更新：2026-10-20（Asia/Shanghai）。本文件只保留当前状态，历史细节见 [CHANGELOG.md](CHANGELOG.md)。

## 必读顺序

1. [项目工作规范](AGENTS.md)。用户要求：**每次更新后新增一篇中文更新日志，并同步本交接说明。**
2. [最近一轮：Android 12 API 31 模拟器验证](docs/updates/2026-10-20-07-android12-emulator.md)。AOSP 模拟器 15 项通过；不是 OriginOS / 真机验收。
3. [上一轮：发布 1.1.1-local.4 并补跑 Playwright](docs/updates/2026-10-20-06-release-and-playwright.md)；[更早：重新打包 1.1.1-local.4](docs/updates/2026-10-20-05-apk-1.1.1-local.4.md) 与 [切词动画/中文选英文](docs/updates/2026-10-20-04-study-animation-and-recall-choice.md)。
4. 运行 `git status --short --branch`、`git log -5 --oneline`，以实际工作区和远端状态为准。

## 当前可用版本

- 项目目录：`E:\workplace\英语单词系统`。
- GitHub 公开库：[SathRose/wordforge-local](https://github.com/SathRose/wordforge-local)，分支 `main`。
- 当前 APK：`1.1.1-local.4`，versionCode `4`，包名 `com.wordforge.local`，最低 Android 8.0。
- 本地安装包：`releases/词匠-本地版-1.1.1-local.4.apk`（被 `.gitignore` 忽略，不随 Git 提交）。
- [发布页面](https://github.com/SathRose/wordforge-local/releases/tag/v1.1.1-local.4)；[APK 下载](https://github.com/SathRose/wordforge-local/releases/download/v1.1.1-local.4/WordForge-1.1.1-local.4.apk)；[HTML 下载](https://github.com/SathRose/wordforge-local/releases/download/v1.1.1-local.4/WordForge-1.1.1-local.4.html)；Release id `418200198`。
- APK SHA-256：`d0e8de76a4fbfb11d26471246eef62c77781855e26c98d6b0a19ef157e865c23`；HTML SHA-256：`33d6a38a77ab44ec233337a972a23d88323e6abe4c72435189f8ff2e1b275b7a`；签名证书 SHA-256 与旧版一致。
- 旧版功能提交 `804d8b5`；发布校验和提交 `08efafb`；功能标签 `v1.1.1-local.3`；修改前基线 `baseline-local-20261020`。
- 电脑入口：`http://127.0.0.1:8765/`，启动/关闭脚本见根目录。服务启停不会清空浏览器数据；实际运行状态需重新检查。

## 已完成，不要当作待办重复重做

- 初始化本地 Git、建立公开仓库并推送；排除签名、私人学习备份与原始截图。
- 手机首页开始学习进入首屏，统计两列显示，长词书名不再挤坏标题。
- 学习提供上一张、跳过、保存评价并下一张；保留原评分和撤销语义，修复总结。
- 选择题现已点击即自动保存并推进：答对记“认识”、答错记“忘记”，不再要求手工设置掌握情况；拼写题和例句填空输入题已移除，旧配置在运行时过滤。
- 切词时增加轻量滑入动画：下一词从右、上一词从左，尊重系统“减少动态效果”；中文选英文选择题保留，只停用拼写/填空输入。
- 已重新打包 `1.1.1-local.4`（versionCode 4）：正式包与 QA 包构建成功，隔离模拟器原生 UI 回归 16 项通过；正式包同签名覆盖安装并保留数据。
- `v1.1.1-local.4` 已发布 GitHub Release，上传 APK 与 HTML；下载校验和与本地构建一致。移动端 Playwright 回归 238 项通过。
- 已在 Android 12 API 31 AOSP 模拟器（`WordForge_API31`）完成 15 项原生回归；API 31 WebView 的 CDP 触摸/截图不可用，测试用 DOM click 回退并跳过 IME 断言。
- 修复从首页进入精读时事件未挂载；支持点词底部抽屉、辅助档位、字号、阅读位置恢复和导入草稿保留。
- Android 返回键按栈逐层返回，底部导航避让系统栏和软键盘；停止朗读会取消分段任务。
- 电脑本地服务已在该次功能更新后重启；新旧 APK 签名一致，并完成覆盖安装后的数据保留检查。

## 最近功能版本的验证证据

- API 36 原生 UI 回归 16 项通过、0 失败（`emulator-5556`）；覆盖选择题自动推进、撤销、返回键、软键盘、粘贴导入和重载持久化。
- Android 12 API 31 AOSP 模拟器（`WordForge_API31`）原生回归 15 项通过、0 失败；CDP 触摸/截图不可用，使用 DOM click 回退，IME 断言跳过。
- QA 包内验证：中文选英文、无拼写输入框、`anim-next` / `wfCardNext` 均生效。
- 正式包 `versionCode=4`、`versionName=1.1.1-local.4`，签名证书 SHA-256 与旧版一致；同签名覆盖安装成功，`firstInstallTime` 保持原值。
- 上一轮逻辑回归与导入 10/16/14 项通过、结构检查 0 错误；本轮 `wordforge.html` 未再修改，这些结果继续有效。
- 移动端 Playwright 回归 238 项通过、0 失败（临时 `playwright-core` + 系统 Chrome，七种尺寸）。
- Release 下载验证：APK/HTML 均 HTTP 200，SHA-256 与本地构建一致。
- 本机原始结果在被 Git 忽略的 `test-results/`；可复现脚本在 `checks/`。

## 尚未完成 / 优先下一步

1. **等待用户在 iQOO Neo9 上反馈 1.1.1-local.4 的实际体验。** 本轮已在 Android 12 AOSP 模拟器跑通 15 项，但它不是 OriginOS 真机；动画流畅度、触控手感仍需真机确认。
2. **API 31 的触摸/IME 未用 CDP 真实验证**：该 WebView 的 CDP 触摸/截图不可用，测试用 DOM click 回退并跳过 IME 断言；API 36 真实触摸/键盘 16 项仍有效。不要声称 OriginOS 真机通过。
3. 依据真机截图、操作路径和屏幕/字体设置复现剩余问题，优先检查首页、精读、系统返回与键盘。没有反馈时不要编造新的故障。
4. 新闻源在具体手机网络下的可达性未全面验收；目前交互测试使用隔离文本，网络问题与布局问题要分开定位。

## 构建与数据注意事项

- `wordforge.html` 是主应用，`android/build-apk.cjs` 打包该文件，不要误改上游缓存或历史备份。
- 核心测试、外部 Playwright 配置、原生 QA 测试命令见 [README](README.md) 和 [移动端说明](docs/MOBILE-UI.md)。不要运行会改数据的原生回归脚本到真实手机上。
- `android/signing/` 中的现有签名只在本机保存，绝不上传；覆盖更新不能另换签名。用户安装前先导出完整备份，不要卸载旧版。
- 电脑与 APK 数据独立；固定浏览器来源不变，不能用清库方式“修复”显示问题。
- `v1.1.1-local.4` 已发布 Release，含 APK 与 HTML；签名文件仍只在本机。电脑版 HTML 已在仓库。

## 可直接发给新对话的一句话

> 请先阅读本项目 AGENTS.md、HANDOFF.md、CHANGELOG.md 和其中最近的功能更新日志，检查 Git 现场后继续。当前已发布 1.1.1-local.4；API 36 原生 16 项、Android 12 AOSP 模拟器 15 项、Playwright 238 项通过，但都不是 OriginOS 真机验收。真机体验仍待我的 iQOO Neo9 反馈。每轮完成后新增更新日志并更新交接说明。
