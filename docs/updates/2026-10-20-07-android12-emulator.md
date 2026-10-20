# 2026-10-20 · 07 · 在 Android 12 API 31 模拟器验证 1.1.1-local.4

## 基本信息

- 日期/时区：2026-10-20，Asia/Shanghai。
- 类型：测试。
- 应用版本与版本码：`1.1.1-local.4`，versionCode `4`；**无新 APK**（`wordforge.html` 未修改）。
- 用户需求：在接近 iQOO Neo9 的 Android 12 系统环境中模拟验证。
- 状态：Android 12 AOSP 模拟器验证完成；**不是 OriginOS / 真机验收**。

## 本轮完成内容

1. **准备 Android 12 系统镜像**
   - 官方镜像：`system-images;android-31;default;x86_64`（Android 12 / API 31）。
   - 由于 Google 直链下载速度仅约 40KB/s，改用腾讯 Android SDK 镜像下载同一官方 zip。
   - 镜像大小 `657,246,510` 字节，SHA-1 `58bff3cb182c79bbfe3980fe77b87b51b9f7ad71`，与官方 `sys-img2-3.xml` 一致。
   - 解压到 `D:\Android\SDK\system-images\android-31\default\x86_64`。

2. **创建独立 Android 12 AVD**
   - AVD 名：`WordForge_API31`，端口 `emulator-5554`。
   - 复制现有 API 36 AVD 配置，只把 `image.sysdir.1`/`target` 改为 `android-31`，不修改现有 API 34/36 模拟器。
   - 启动参数：`-avd WordForge_API31 -port 5554 -no-snapshot -no-audio -no-boot-anim -gpu swiftshader_indirect`。
   - 确认 `ro.build.version.sdk=31`、`ro.build.version.release=12`、`sys.boot_completed=1`。

3. **在 Android 12 上安装并测试 1.1.1-local.4**
   - 安装 QA 包 `android/build-qa/wordforge-qa.apk`（versionCode 4）。
   - 原生 UI 回归结果：**15 项通过、0 失败（API 31）**。
   - 覆盖：首页首屏、底部导航不重叠、学习卡打开、选择题自动保存推进、无手动评分条、返回上一张撤销、Android 返回键确认、精读辅助、点词抽屉、阅读位置恢复、粘贴导入、WebView 重载持久化。

4. **API 31 测试环境限制与适配**
   - API 31 的 WebView DevTools 不响应 `Input.dispatchTouchEvent`（20 秒超时），且 `Page.captureScreenshot` 会挂起。
   - 为完成功能验证，测试增加 `DOM_CLICK=1`（用 DOM `element.click()` 回退）和 `SKIP_SCREENSHOTS=1`；IME 打开断言在该回退模式下明确跳过，导航不重叠与粘贴导入仍保留。
   - `android/check-webview.cjs` 的 CDP 调用增加 20 秒超时，避免测试永久卡住。
   - **API 36 的真实触摸与软键盘测试仍为 16 项通过**；本轮没有降低 API 36 的触摸验收标准。

5. **不属于 OriginOS 真机验收**
   - 使用的是 Google/AOSP Android 12 镜像，不是 vivo OriginOS；不包含 OriginOS 的桌面、调度、字体和系统权限定制。
   - 不能写成 iQOO Neo9 / OriginOS 真机通过；真机行为仍需用户在设备上确认。
   - 第三方 OriginOS 固件未下载：它不是 Android Emulator 可启动的系统镜像，来源与安全风险不可控。

## 关键文件与产物

| 文件 / 环境 | 说明 |
| --- | --- |
| `checks/test-android-ui.cjs` | 增加 `DOM_CLICK` / `SKIP_SCREENSHOTS` 回退、API 31 IME 断言跳过；保留 API 36 真实触摸路径。 |
| `android/check-webview.cjs` | CDP 调用增加 20 秒超时，避免 WebView 不响应时永久挂起。 |
| `WordForge_API31` AVD | 本机模拟器配置，**不在 Git 仓库**；镜像位于本机 SDK。 |
| `test-results/android12-current.png` | 本机 Android 12 首页截图，Git 忽略。 |
| `docs/updates/2026-10-20-07-android12-emulator.md` | 本日志。 |

## 验证

| 命令 / 环境 | 真实结果 |
| --- | --- |
| `adb -s emulator-5554 shell getprop ro.build.version.sdk` / `ro.build.version.release` | `31` / `12`。 |
| `sha1sum x86_64-31_r05.zip` | `58bff3cb…`，与官方 XML 一致。 |
| `adb -s emulator-5554 install -r android/build-qa/wordforge-qa.apk` | `Success`。 |
| `DOM_CLICK=1 SKIP_SCREENSHOTS=1 WORDFORGE_DEVICE=emulator-5554 node checks/test-android-ui.cjs` | `RESULT 15 passed, 0 failed (API 31)`；IME 打开断言明确 SKIP。 |
| API 36 原生回归（上一轮） | 16 项通过、0 失败（真实触摸/IME）。 |
| Playwright 七尺寸回归（上一轮） | 238 项通过、0 失败。 |

## Git、产物与发布

- 分支：`main`。
- 本轮提交主题：`test: validate 1.1.1-local.4 on Android 12 emulator`。
- 本地提交 / 远端推送：本轮交付时执行；以 `git status --short --branch` 和最终回复为准。
- APK：**无新 APK**；`1.1.1-local.4` Release 已在上一轮发布，资产不变。
- AVD、API 31 镜像和截图均只在本机，不进入 Git；签名文件仍不上传。

## 未完成、风险与下一步

1. **OriginOS / iQOO Neo9 真机验收仍未完成**：本轮是 Android 12 AOSP 模拟器，不能替代 OriginOS 真机。需要用户在真机上安装 `1.1.1-local.4` 并反馈。
2. **API 31 的触摸与 IME 没有用 CDP 真实验证**：该 WebView 的 CDP 触摸/截图不可用，测试用 DOM click 回退并跳过 IME 断言；API 36 的真实触摸/键盘结果仍有效。
3. **API 31 镜像来自镜像站**：已用官方 SHA-1 校验完整性，但仍不是 Google 直链下载；如需完全官方来源，可在网络条件改善后重新下载。
4. 新闻源在具体手机网络下的可达性仍未全面验收。

## 接手提醒

- 新对话先读 `AGENTS.md`、`HANDOFF.md`、`CHANGELOG.md` 和本日志，再检查 `git status --short --branch`。
- 不要把 Android 12 AOSP 模拟器结果写成 OriginOS / iQOO Neo9 真机通过。
- 不要下载或刷入第三方 OriginOS 固件；它不能用于标准 Android Emulator。
- 已同步 `CHANGELOG.md` 与 `HANDOFF.md`：是。
