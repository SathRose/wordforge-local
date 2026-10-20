# 2026-10-20 · 03 · 选择题自动判分推进，移除打字题

## 基本信息

- 日期/时区：2026-10-20，Asia/Shanghai。
- 类型：功能。
- 应用版本与版本码：仓库内 `wordforge.html` 已更新；APK 仍为 `1.1.1-local.3`（versionCode `3`），**本轮没有重新打包 APK**。
- 用户需求：
  1. 点完单词选项后自动进入下一个单词，不再要求设置掌握情况；答对归入一批，答错归入另一批。
  2. 取消需要打字的单词题，不再练习拼写。
- 状态：已完成代码、测试与文档；Android 安装包尚未包含本轮改动。

## 本轮完成内容

1. **选择题点击即保存并推进**
   - `markAnswer(ok)` 不再停留在人工评分区，而是设置 `S.pending = ok ? 2 : 0` 后直接调用既有 `commitAndNext()`。
   - 答对沿用原评分 `g=2`（“认识”），答错沿用 `g=0`（“忘记”）。
   - 复用原有 `grade()`、记忆曲线、今日学习量、错词本与撤销快照；没有新增另一套“批次”数据结构，因此旧学习记录可直接延续。
   - 提交后立即 `S.i++` 并渲染下一词；最后一张正常进入本轮总结。

2. **移除打字 / 拼写题**
   - 默认 `activeModes` 改为 `["recog", "recall", "listen", "card"]`，设置页题型清单只保留这四项。
   - 删除 `spellBody()`、`clozeBody()`、`checkSpell()`、`quizSpell()` 及 `spellIn` / `spellOk` / `qSpell` / `qSpellOk` 的绑定。
   - 学习卡的 `cardBody()` 不再派发到拼写或例句填空输入分支；测试中心的题型下拉与混合题型也不再生成拼写题。
   - 例句仍保留在词条详情中，只是不再以“填空输入”形式出题。

3. **旧配置兼容**
   - `sessionModes()`、`pickModeIdx()`、`curMode()` 在运行时过滤旧配置里的 `spell` / `cloze`；过滤后为空时回退 `card`。
   - `modeOK()` 对 `spell` / `cloze` 一律返回不可用。
   - 旧 `vask = "spell"` 不再显示“写出来”按钮；派生时按方向回退为卡片速记或看义想词，不会重新生成输入框。
   - 设置说明与源码注释同步改为四种无需输入的题型。

4. **回归测试同步**
   - `checks/test-logic.js`：默认题型改为四项，覆盖旧 `spell` / `cloze` 被过滤、旧动作回退卡片、题型轮换与自动回退。
   - `checks/test-mobile-ui.cjs`：删除拼写输入断言，改为“点击正确选项后立即推进并记录为认识”“点击错误选项后记录为忘记”“页面不再出现 `#spellIn` 与手动评分条”。

## 关键文件与实现入口

| 文件 | 变更或接手说明 |
| --- | --- |
| `wordforge.html` | `markAnswer()` 改为直接提交；`CFG_DEF.activeModes`、`MODES`、`sessionModes()`、`pickModeIdx()`、`curMode()` 统一过滤旧输入题型；删除拼写/填空渲染与绑定；测试中心题型下拉移除拼写。 |
| `checks/test-logic.js` | 更新题型默认值、旧配置兼容与轮换断言。 |
| `checks/test-mobile-ui.cjs` | 更新为选择题自动保存、自动推进与对错记录断言。 |

## 验证

| 命令 / 环境 | 真实结果 | 证据位置 |
| --- | --- | --- |
| `node checks/check-structure.js wordforge.html` | 通过：0 错误、1 条既有模板标签提示；4 个内联脚本语法正确。 | 本机终端输出 |
| `node checks/test-logic.js wordforge.html` | 通过：退出码 0，全部断言通过。 | 本机终端输出 |
| `node checks/test-textbook-import.cjs` | 通过：10 项。 | 本机终端输出 |
| `node checks/test-vocabgo-import.cjs` | 通过：16 项。 | 本机终端输出 |
| `node checks/test-book-picker.cjs` | 通过：14 项、0 失败。 | 本机终端输出 |
| `node --check checks/test-logic.js` / `node --check checks/test-mobile-ui.cjs` | 通过。 | 本机终端输出 |
| `git diff --check` | 通过，无空白错误。 | 本机终端输出 |
| 内置浏览器实际点击 | 通过：`tedious` 答对后进度 1/20 → 2/20，记录 `ok=1, no=0`；`oblige` 答错后进度 2/20 → 3/20，记录 `ok=0, no=1`；两步均没有评分条。 | 本机浏览器会话 |
| `node checks/test-mobile-ui.cjs` | **未运行成功**：`Cannot find module 'playwright'`，本机未安装该外部模块；没有执行页面断言，不是代码断言失败。 | 本机终端输出 |

## Git、产物与部署

- 分支：`main`。
- 本轮提交主题：`feat: auto-advance after choice answers and remove typing exercises`。
- 本地提交 / 远端推送：在本轮交付时执行；以 `git status --short --branch` 和最终交付回复为准。
- APK：**无新 APK**。当前仍是 `releases/词匠-本地版-1.1.1-local.3.apk`，本轮 HTML 改动尚未进入安装包；如需手机端生效，需要重新构建并递增 versionCode。
- 本地服务：电脑版读取的是缓存的 HTML，修改后需重启本地服务才会加载新版本；本轮未重启。
- 数据迁移：不清空或改写学习记录；旧配置在运行时过滤，不需要迁移数据库。

## 未完成、风险与下一步

1. **Android APK 尚未重打包**：当前 APK 仍是旧交互，手机上仍会出现拼写题与手动评分。若要在手机使用新行为，需要按既有签名重新构建、递增 versionCode，并在隔离 QA 模拟器验证后再交付。
2. **移动端 Playwright 回归未执行**：本机缺 `playwright` 模块。安装后运行 `node checks/test-mobile-ui.cjs`，重点复核新增的自动推进与对错记录断言。
3. **真机体验仍未验收**：iQOO Neo9 / Android 12 的实际屏幕、字体与系统返回行为仍以用户反馈为准，不能把本轮桌面浏览器结果写成真机通过。

## 接手提醒

- 新对话先读 `AGENTS.md`、`HANDOFF.md`、`CHANGELOG.md` 和本日志，再检查 `git status --short --branch`。
- 不要重复实现本轮已完成的自动提交与移除拼写题；不要恢复 `spell` / `cloze` 为可出题题型。
- 不要清空用户真实学习记录，也不要卸载旧版 APK；覆盖更新必须复用本机签名。
- 已同步 `CHANGELOG.md` 与 `HANDOFF.md`：是。
