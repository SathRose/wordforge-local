# 2026-10-20 · 11 · 答错即时反馈与切换栏目恢复学习

## 基本信息与用户需求

- 日期/时区：2026-10-20，Asia/Shanghai。
- 类型：功能修复、测试与本地构建。
- 应用版本：`1.1.1-local.6`，versionCode `6`，包名 `com.wordforge.local`。
- 用户反馈：背词时答错不容易注意到，需要立即标出正确项；开始学习后切换到其他栏目，再回学习会初始化，无法回到原单词。
- 状态：源码修复、浏览器回归、隔离 API 36 QA 回归与本地正式包构建完成；未公开发布、未真机验收。

## 原因与完成内容

1. 原判题函数给选项加高亮后立即提交并切下一词，正确项几乎没有显示时间。现在答错仍即时按“忘记”保存，但停留在原题，正确项显示绿色“✓ 正确答案”，误选项显示红色“✗ 你的选择”，并提供答错说明。短屏下自动将正确项滚动至可见区域，避免只在屏外变色。
2. 点击“已核对 · 下一张”、按 Enter/空格或向左翻词后再继续。已保存标记保证确认时不会重复打分；不再提供手工改分条，已答选项锁定。答对沿用“认识”并自动推进。
3. 调整撤销路径：确认到下一题后回上一张仍完整撤销；答错停留时回上一张，先撤销当前错题再撤销上一张的评价/跳过步骤；首张答错可撤销重答，不越界。还原词条进度、每日计数、每日词表及本轮对错数。
4. 导航不再无条件清除会话恢复标记。回到会话对应的学习/复习栏目时恢复原队列、索引、选项顺序、揭晓/待评分状态和错题反馈。明确结束或切换词书仍按原规则清理旧会话，不恢复跨词书旧队列。
5. 选择题数字键复用点击判题流程，已经判分时不能再次改分或生成评分条；离开学习卡后，Enter、收藏等学习快捷键不再操作隐藏会话。
6. 版本递增并使用本机原签名生成正式包及 QA 包。保留此前批次自动续批、换批与切词书修复。

## 关键文件与实现入口

| 文件 | 本轮修改 |
| --- | --- |
| `wordforge.html` | `go`/`render` 保留和恢复会话；`renderSession` 缓存选项及还原反馈；`studyOptionHTML` 明确标记；`markAnswer`/`commitAndNext` 保存但可停留；`prevWord`/`restoreStep` 撤销；`onKey` 防重复判分。 |
| `checks/test-logic.js` | 新增 14 项会话/判分/撤销检查；旧学习入口夹具先明确结束之前会话，以适应新的恢复行为。 |
| `checks/test-mobile-ui.cjs` | 真实栏目按钮往返、揭晓待评分保留、错题反馈/可见性、选项锁定、数字键、撤销、最后一词确认、中文选英文及复习会话恢复。 |
| `checks/test-android-ui.cjs` | 正确项确定性触控；新增错题停留、原生导航恢复、确认不重复计分及完整撤销。 |
| `android/AndroidManifest.xml`、`android/README.md` | 版本码 6、版本名 local.6 及功能说明。 |
| `README.md`、`docs/MOBILE-UI.md` | 当前行为、验证及进程内恢复边界。 |
| `releases/SHA256.txt`、`releases/apk-build-info.json` | 新包摘要；构建元数据保留本机。 |
| `CHANGELOG.md`、`HANDOFF.md` | 最新日志索引、版本、验证和后续边界。 |

## 验证命令与真实结果

| 命令/环境 | 真实结果 |
| --- | --- |
| `node checks/test-logic.js wordforge.html test-results/logic-feedback-result.txt` | 最终 **747 项通过、0 失败**。首次为 731 通过、2 失败：旧夹具假设导航会结束会话，与本轮恢复行为冲突；明确结束夹具旧会话并新增恢复检查后全部通过。 |
| `node checks/check-structure.js wordforge.html` | **0 错误、1 警告**；警告是动态 HTML 模板标签扫描计数，不是脚本语法错误。 |
| 临时外部 `playwright-core`、系统 Chrome：`node checks/test-mobile-ui.cjs` | 最终 **392 项通过、0 失败、无页面 JavaScript 异常**；覆盖 320×640、360×640、390×844、412×892、458×966、800×360、1440×900。所有数据在隔离 context 内。 |
| `node checks/test-textbook-import.cjs` | **10 项通过**。 |
| `node checks/test-vocabgo-import.cjs` | **16 项通过**。 |
| `node checks/test-book-picker.cjs` | **14 项通过、0 失败**。 |
| `node android/build-apk.cjs`、`node android/build-apk.cjs --qa` | 正式包及 QA 包构建成功，签名及 ZIP 对齐校验通过。Java 仅提示使用弃用 API。最终可见性补修后两包均重新构建。 |
| `adb -s emulator-5556 emu avd name` / `shell getprop ro.build.version.sdk` | 确认为隔离测试 AVD `PaperStudio_API36`，API 36。没有对真实手机执行测试。 |
| `adb -s emulator-5556 install -r android/build-qa/wordforge-qa.apk`；启动 Activity；`WORDFORGE_DEVICE=emulator-5556 node checks/test-android-ui.cjs` | QA 安装成功；最终包 **20 项通过、0 失败**，包含真实触控、原生返回、软键盘、导入和重载持久化。未启用 DOM 点击回退。 |
| `java -jar .../apksigner.jar verify --print-certs`，分别验证 local.5 / local.6 | 均通过，同一签名证书；最终重建后 local.6 再次核验通过。 |
| `aapt2 dump badging` | `com.wordforge.local`，versionCode 6，versionName local.6，minSdk 26、targetSdk 35。 |
| Python `zipfile`/`hashlib` 校验最终 APK、源码、包内 HTML 和 QA 元数据 | 全部摘要一致；正式/QA 内置 HTML 一致，包含最终错题可见性与导航恢复修复。 |
| `Stop-WordForge.ps1`、`Start-WordForge.ps1 -NoBrowser`；原来源健康接口与源码 SHA-256 比较 | 已在 `http://127.0.0.1:8765/` 重启，最终源码摘要匹配；没有清空或改写浏览器学习数据。 |
| `git diff --check`；`git status --short --branch` | 最终核对差异格式及已有未提交内容；无新增空白错误，工作区仍有本轮及先前未提交修改。 |

本机详细证据在 Git 忽略的 `test-results/logic-feedback-result.txt`、`mobile-ui-result.json`、`mobile-feedback-console.txt`、`android-ui-api36-result.json`、`android-feedback-console.txt`、`structure-feedback-result.txt` 及构建输出。已查看隔离浏览器错题截图进行视觉检查，不把截图原件加入公开仓库。

## 版本、产物、签名与发布状态

- 正式 APK：`E:\workplace\英语单词系统\releases\词匠-本地版-1.1.1-local.6.apk`。
- 大小：**4,690,609 bytes**。
- versionCode：**6**；versionName：**1.1.1-local.6**。
- APK SHA-256：`ebdb0fc772c2026efde91f9fc19aa5f8001e6967e363ae5af832859369c4674c`。
- 源码 HTML SHA-256：`02af16960e6dd7b6410c658febff318467359855ac340d1e9d6e5b46db3f46f9`。
- 包内 HTML SHA-256：`a74c169440f27d2ac246fc21b4a4572d238d5d93cdd593121d73f85ce38c9bd9`；原生桥注入导致其与源码摘要不同。
- 签名证书 SHA-256：`c2c6dedc233415427504c86a54989ee611e98dea36afcac485c720199bcd49c6`，与原 local.5 / local.4 一致。签名私钥和密码仍只在本机，不进入 Git。
- 正式包不启用 WebView 调试；仅 QA 包启用。正式包具备同签名、同包名和递增版本码条件，但**本轮没有实际执行正式包覆盖安装及真机数据保留验收**；只在隔离模拟器安装并测试 QA 包。
- 分支 `main`；开始时 HEAD `240001b`，本轮和之前的源码、测试、构建与日志改动保留工作区，**没有本地提交、没有推送、没有新 Release 发布**。无本轮实现提交哈希，不编造自引用哈希。
- 新 APK 仅在本地生成，**没有已实际发布的新版下载地址**。远端 local.4 下载链接仍是旧包，不包含本轮修复；重新安装 local.4 / local.5 不会获得本轮功能。

## 未完成项、下一步与接手注意事项

1. 需要用户在 iQOO Neo9 上覆盖安装 local.6 后确认交互体验。更新前先导出完整备份，不卸载旧版、不清数据。API 36 模拟器不是 OriginOS 真机验收，本轮未重跑 Android 12 API 31。
2. 当前恢复范围为**同一页面进程内切换栏目**。刷新页面、系统回收进程后恢复到准确卡片位置尚未实现；已经保存的学习记录仍持久化，不应将本轮表述为新增了跨重启会话持久化。
3. 新包公开发布、Git 提交/推送尚未执行，不能把本地构建写成远端同步完成。后续操作前再次检查 Git 状态，保留先前未提交改动。
4. `wordforge.html` 为唯一主应用修改入口；本地服务缓存源码，之后修改仍需在原端口/来源重启。APK 不会自动加载电脑新 HTML，必须重新打包。
5. 不对真实手机运行会改数据的回归脚本；只用隔离浏览器和 QA 模拟器。不要公开签名材料、真实学习备份或原始隐私截图。

已同步 `CHANGELOG.md` 与 `HANDOFF.md`。
