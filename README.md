# 词匠 WordForge · 本地增强版

离线背词、词书排序和美文精读，提供电脑单文件应用及 Android WebView 安装包。

基于 [zhiyf-huajq/wordforge](https://github.com/zhiyf-huajq/wordforge) 的 MIT 版本修改；上游署名和许可见 [upstream-LICENSE](upstream-LICENSE)。这不是上游官方发行版。

## 电脑运行

需要 Node.js 18+，无需安装 npm 依赖：

```sh
node wordforge-server.cjs
```

浏览器打开 `http://127.0.0.1:8765/`。Windows 也可双击 `Start-WordForge.cmd`。

## 验证

```sh
node checks/check-structure.js wordforge.html
node checks/test-logic.js wordforge.html
node checks/test-textbook-import.cjs
node checks/test-vocabgo-import.cjs
node checks/test-book-picker.cjs
```

## Android 构建

见 [android/README.md](android/README.md)。运行 `node android/build-apk.cjs`；仅调试验证使用 `--qa`。
签名文件仅保存在本机，第一次构建会生成独立签名。不同开发者签名的 APK 不能互相覆盖安装。

## 数据与公开范围

- 学习进度在浏览器或 APK 私有存储中；更新前请在设置中导出完整备份。
- 仓库不包含个人学习备份、签名密钥、密码、原始截图、构建缓存及本机部署信息。
- `wordforge.html` 是可直接运行的应用源文件，包含内置词典及本地增强词书；词典来源另见 `imports/vocabgo/SOURCES.md` 和 ECDICT 许可。
- 基础背词无需网络；联网文章获取依赖内容源的网络可达性。电脑与安卓数据独立。
