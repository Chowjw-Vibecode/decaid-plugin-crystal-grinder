# 小方 · CRYSTAL 控制器 0.2.0

Decaid 独立磨豆机插件，兼容「这一杯 · OneCup」与支持插件页面入口的 Streamline。皮肤与磨豆机插件分别安装、分别更新。

## 下载与安装

[国内发行页](https://gitee.com/chowjw/decaid-plugin-crystal-grinder/releases/tag/v0.2.0) · [国内 ZIP](https://gitee.com/chowjw/decaid-plugin-crystal-grinder/releases/download/v0.2.0/thiscup-crystal.reaplugin.zip) · [GitHub 发行页](https://github.com/Chowjw-Vibecode/decaid-plugin-crystal-grinder/releases/tag/v0.2.0) · [直接下载 ZIP](https://github.com/Chowjw-Vibecode/decaid-plugin-crystal-grinder/releases/download/v0.2.0/thiscup-crystal.reaplugin.zip)

推荐在 Decaid 中打开 **Plugins → Plugin actions → Install plugin → GitHub Release**：

- **Repository**：`Chowjw-Vibecode/decaid-plugin-crystal-grinder`
- **Asset name**：`thiscup-crystal.reaplugin.zip`，也可留空（每版只有一个 ZIP）。
- 安装后启用「小方 · CRYSTAL 控制器」，并开启 **Decaid 自动检查更新**，后续由 Decaid 原生管理插件更新。若新版新增权限，需在 Decaid 的 **Review** 中确认。

旧 ZIP 安装用户需从上述 GitHub Release 入口以同一插件标识重装一次，登记更新来源；不要先卸载。此说明不代表当前设备已经登记新来源。

国内手动安装：下载 **thiscup-crystal.reaplugin.zip**，保留 ZIP 格式，通过 **Plugins → Plugin actions → Install plugin → ZIP file** 安装并启用。国内 ZIP 手装不会自动登记 GitHub 更新来源。

OneCup：从准备页研磨入口打开。支持插件页面入口的 Streamline：从首页顶部「研磨」、研磨度区域或扩展设置打开。

插件标识保持 `thiscup-crystal.reaplugin`，沿用已有设备名称、首选设备与平板上的研磨方案，不清空这些数据，也不替换 OneCup 皮肤。

## 操作

- 选择磨豆机，必要时扫描、连接。打开页面、选择设备或连接本身不会开始研磨；记住的设备离线时会提示重连。
- 参数框与加减按钮只修改草稿。点击「应用参数」才向磨豆机下发参数。
- 点击「开始研磨」会应用参数、确认刀盘到位，再启动。支持手动、定时、智能启动；定时和智能使用设备自身设置。
- 点击「停止研磨」会取消尚未发出的启动操作，并请求设备停止。
- 目标刀距或实际读回小于 **10** 时拒绝启动；**10 是允许边界**，刻度单位由设备定义。此检查不能替代现场确认刀盘状态。
- 「保存研磨方案」按咖啡方案与设备分别保存，也可读取其他方案作为草稿。

关闭面板返回原页面，已开始的研磨可能继续；需要停止时请使用「停止研磨」。断线后请核对设备实际状态。

## 构建与软件验证

维护者发布约定：正式 Release 标签使用与 `manifest.version` 一致的 `vX.Y.Z`，非草稿、非预发行，每版仅上传一个固定名 `thiscup-crystal.reaplugin.zip`。

需要 Node.js、Python 3。`node build.mjs` 生成自包含安装包，ZIP 中仅包含 `manifest.json`、`plugin.js`、`README.md`，页面资源嵌入驱动文件。

```sh
node build.mjs
node --test tests/driver.test.mjs tests/entry.test.mjs
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/panel-browser.cjs
```

也可通过 `PLAYWRIGHT_MODULE` 指定已有 Playwright 安装路径。浏览器测试使用本地模拟响应，不连接磨豆机。前端与驱动沿用既有控制器实现，保留蓝牙队列、启动保护和停止取消逻辑；本次公开发布不宣称完成新的实机验证，实际启停与刀盘运动需另行现场确认。
