# Deepcel 工作簿 · v2 皮肤

`Small-tailqwq/dsh-deepcel` 的 **v2 skin 资产目录**重写。v1 是一个 cordis 客户端插件（`src/client/index.ts` + CSS Modules + `skin.json` v1 清单）；v2 按 `@linxin666/dsh-client-ui-skin-center` 的 skin-manifest-v2 契约重写为纯资产目录，由 skin-center 作为唯一加载器/渲染器。

## 目录

```
dsh-deepexcel/
├── skin.json              # v2 清单（skinManifestVersion: 2）
├── skin.css               # L1 token + L2 语义样式（工作簿 chrome、工作区网格、坐标）
├── patches.css            # L3 自由选择器补丁（原生面板/菜单/对话框/消息改造成单元格）
├── hooks.mjs              # facets.client 逃生舱（v1 客户端 JS 移植，defineSkinHooks）
├── dsh-market.provenance.json  # 市场安装 provenance（sha256 固定运行时文件）
├── preview/               # light.webp / dark.webp 预览图
├── docs/                  # GitHub Pages 预览页（jensen-yao.github.io/dsh-deepexcel）
├── README.md / LICENSE / NOTICE
```

> 仓库根即皮肤目录：把本仓库文件放入 `$DSH_HOME/skins/deepcel/`（`skin.json` 的 `id: deepcel` 必须等于目录名），或在皮肤中心安装本皮肤。

## v1 → v2 改动要点

| v1 | v2 |
| --- | --- |
| cordis 插件 + `apply(ctx)` + `ctx.effect` | `defineSkinHooks()` 默认导出，`apply(ctx)` + `ctx.onCleanup`（幂等） |
| `inject: ['locale', 'layout', 'sessions']` 服务注入 | 无服务注入；locale 读 `document.documentElement.lang`（MutationObserver 监听），侧边栏点击原生按钮，会话跟踪选中的原生会话行 |
| CSS Modules（`cls('workbookChrome')` 哈希类名） | 明文类名（`.workbookChrome` 等），加载器在 `html[data-dsh-skin="deepcel"]` 下强制作用域 |
| `body[data-dsh-deepcel]` 作用域 + `:global(#root)` | 全部选择器去掉 v1 前缀，由加载器重写为 `html[data-dsh-skin="deepcel"] …`；`:global(#root)` → `#root` |
| 亮/暗 token 写在 `body[data-dsh-deepcel]` / `[data-ds-dark-theme]` | token 写在 `:root`（亮）与 `body[data-ds-dark-theme]`（暗），加载器自动克隆 root-body token |
| v1 字段 `package` / `wiring` / `bodyAttr` | 移除（v2 fail-closed，遗留字段仅告警） |
| `--dsw-alias-*` 全量 remap + `--deepcel-*` 布局变量 | 保留，新增 `--dsw-alias-label-primary-foreground: #fff` 满足主按钮对比度契约 |

## hooks 信任模型（重要）

skin-center 的安全模型：**用户目录直接放置的皮肤（`$DSH_HOME/skins/<id>/`）不运行 hooks**——`GET /skins/<id>/hooks.mjs` 返回 403，除非该皮肤与官方市场字节级一致（provenance）。因此：

- 本目录以**用户皮肤**方式安装时：`skin.css` / `patches.css` / preview 全部生效（绿色工作簿主题、单元格边框、BOOK/ROW 标签、菜单改造成 Filter 下拉等），但 **hooks 不运行**，工作簿 chrome（功能区、公式栏、行列坐标、工作表标签、选区）不渲染。
- 若要完整工作簿体验，需将本皮肤作为 **builtin** 安装进 skin-center 包：

```sh
# 1) 复制皮肤目录进 skin-center 内置 skins/
cp -r <此目录> "<harnessHome>/profiles/web/node_modules/@linxin666/dsh-client-ui-skin-center/skins/deepcel"
# 2) 把 "skins/deepcel" 追加到该包 package.json 的 files 白名单
#    （shippedSkinIds 据此把 deepcel 列入目录，origin=builtin → hooks 放行）
# 3) 重启 dsh web（shippedSet 在插件挂载时冻结，需重启才能重新读取白名单）
```

## 布局降级

v2 加载器会注入一条 viewport-lock 规则，强制 `html[data-dsh-skin] body { padding: 0 !important }`。因此 v1 的 body padding 方案不可用：

- 功能区的固定偏移改由 `body[data-deepcel-chrome] #root { padding: … }` 承载；
- 所有几何/位移规则（hero 布局、侧边栏折叠、工作簿流网格）都挂在 hooks 设置的 `body[data-deepcel-chrome]` 标记后，**仅当 hooks 运行时**才改变原生布局；
- hooks 被拒（仅声明式生效）时，页面保持原生几何，只叠加 token/补丁外观。

## 验证

- `GET /api/skin-center/v2/catalog` → 出现 `origin: user, id: deepcel`（仅剩一条 hooks-refused 预期告警）
- `GET /api/skin-center/v2/skins/deepcel/stylesheet|patches` → 200，选择器全部强制作用域
- `POST /api/skin-center/v2/active {"active":"deepcel"}` → 应用成功，`html[data-dsh-skin="deepcel"]` 生效

许可与商标：沿用上游 BSD-3-Clause 与 NOTICE 声明（Deepcel 独立社区项目，与 Microsoft 无隶属关系）。
