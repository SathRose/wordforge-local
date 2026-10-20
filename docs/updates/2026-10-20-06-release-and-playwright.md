# 2026-10-20 · 06 · 发布 v1.1.1-local.4 并补跑 Playwright 回归

## 基本信息

- 日期/时区：2026-10-20，Asia/Shanghai。
- 类型：发布 + 测试。
- 应用版本与版本码：`1.1.1-local.4`，versionCode `4`。
- 用户需求：把上一轮未完成的事项完成（发布 Release、补跑移动端 Playwright 回归）。
- 状态：Release 已发布，Playwright 回归通过；真机验收仍需用户设备/反馈。

## 本轮完成内容

1. **发布 GitHub Release**
   - 创建并推送标签 `v1.1.1-local.4`。
   - 通过 GitHub API 创建 Release `v1.1.1-local.4`（release id `418200198`）。
   - 上传发布资产：
     - `WordForge-1.1.1-local.4.apk`
     - `WordForge-1.1.1-local.4.html`
   - 本机没有 `gh`，使用 Git Credential Manager 中已有的 GitHub 凭据调用 REST API；凭据未写入文件、未输出到日志。

2. **发布后下载验证**
   - Release 页面：<https://github.com/SathRose/wordforge-local/releases/tag/v1.1.1-local.4>
   - APK：HTTP 200，`4,686,513` 字节，SHA-256 `d0e8de76a4fbfb11d26471246eef62c77781855e26c98d6b0a19ef157e865c23`，与本地构建一致。
   - HTML：HTTP 200，`12,720,382` 字节，SHA-256 `33d6a38a77ab44ec233337a972a23d88323e6abe4c72435189f8ff2e1b275b7a`，与本地文件一致。
   - 下载地址：
     - <https://github.com/SathRose/wordforge-local/releases/download/v1.1.1-local.4/WordForge-1.1.1-local.4.apk>
     - <https://github.com/SathRose/wordforge-local/releases/download/v1.1.1-local.4/WordForge-1.1.1-local.4.html>

3. **补跑移动端 Playwright 回归**
   - 本机原本没有 `playwright` 模块；将 `playwright-core` 安装到系统临时目录，并使用系统 Chrome 作为浏览器，不修改项目依赖、不向仓库写入 `node_modules`。
   - 命令：
     ```sh
     PLAYWRIGHT_MODULE="C:/Users/24300/AppData/Local/Temp/wf-playwright/node_modules/playwright-core" \
     CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" \
     node checks/test-mobile-ui.cjs
     ```
   - 结果：**238 项通过、0 失败**；覆盖 320×640、360×640、390×844、412×892、458×966、800×360 横屏和 1440×900 桌面。
   - 包含新交互断言：选择题渲染、答对立即推进并记为“认识”、答错记为“忘记”、无手动评分条、无拼写输入框；也覆盖总结、撤销、阅读页与横向溢出。
   - 无浏览器 JavaScript 错误。

4. **已有原生测试结果继续有效**
   - 上一轮已在 API 36 隔离模拟器 `emulator-5556` 完成 16 项原生 UI 回归；本轮未修改 `wordforge.html`，结果继续适用。
   - 正式包 `1.1.1-local.4` 已通过同签名覆盖安装验证，`firstInstallTime` 保持原值。

## 关键文件与产物

| 文件 / 产物 | 说明 |
| --- | --- |
| `releases/SHA256SUMS.txt` | 追加 1.1.1-local.4 发布资产校验和。 |
| `docs/updates/2026-10-20-06-release-and-playwright.md` | 本日志。 |
| `releases/词匠-本地版-1.1.1-local.4.apk` | 本地正式包；Git 忽略，已作为 Release 资产上传。 |
| `android/build-qa/wordforge-qa.apk` | QA 调试包；Git 忽略，仅用于隔离模拟器。 |

## 验证

| 命令 / 环境 | 真实结果 |
| --- | --- |
| `git push origin v1.1.1-local.4` | 标签推送成功。 |
| GitHub API 创建 Release + 上传资产 | Release id `418200198`，APK/HTML 均上传成功。 |
| 下载 APK 并校验 | HTTP 200，4,686,513 字节，SHA-256 与本地一致。 |
| 下载 HTML 并校验 | HTTP 200，12,720,382 字节，SHA-256 与本地一致。 |
| `node checks/test-mobile-ui.cjs`（临时 playwright-core + 系统 Chrome） | 238 项通过、0 失败。 |
| 原生 UI 回归（上一轮，API 36 隔离模拟器） | 16 项通过、0 失败。 |

## Git、产物与发布

- 分支：`main`。
- 本轮提交主题：`docs: publish 1.1.1-local.4 release and record browser regression`。
- 本地提交 / 远端推送：本轮交付时执行；以 `git status --short --branch` 和最终回复为准。
- Release：`v1.1.1-local.4` 已发布，release id `418200198`。
- APK/HTML 发布资产校验和已写入 `releases/SHA256SUMS.txt`。
- 签名文件仍在 `android/signing/`，未上传；APK 使用与 `1.1.1-local.3` 相同的证书，可覆盖更新。

## 未完成、风险与下一步

1. **真机验收仍未完成**：本轮是 API 36 隔离模拟器 + 桌面 Chrome 七尺寸测试，不能写成 iQOO Neo9 / Android 12 真机通过。需要用户在真机安装后反馈动画流畅度、触控与显示效果。
2. **API 31 / Android 12 模拟器验收未完成**：此前镜像下载损坏，未补装；不应把 API 36 结果写成 Android 12 验收。
3. **新闻源可达性未全面验收**：仍取决于具体手机网络；与 UI 回归分开记录。

## 接手提醒

- 新对话先读 `AGENTS.md`、`HANDOFF.md`、`CHANGELOG.md` 和本日志，再检查 `git status --short --branch`。
- `v1.1.1-local.4` 已发布；不要重复创建同名 Release，也不要把本地 APK 误写成未发布。
- 不要上传 `android/signing/`、`password.txt` 或真实用户学习备份。
- 已同步 `CHANGELOG.md` 与 `HANDOFF.md`：是。
