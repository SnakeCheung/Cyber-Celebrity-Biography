# 赛博名人传

基于 `Cyber ​​Celebrity Biography Draft.docx` 和 `cyber_fame_vue_simplified_design.docx` 落地的单页网页游戏项目。

这是一个 `Vue 3 + TypeScript + SCSS + Vite` 的纯前端回合制文本模拟游戏。玩家需要在 40 周内，通过 `网上冲浪 / 加班打工 / 直播整活 / 商店购入` 等操作管理四项资源：

- 金钱
- 流量
- 声望
- 理智

项目已经实现：

- 40 周回合推进
- A / B / C 级事件漏斗式结算
- 状态、道具、结局的数据配置化
- 商店系统与直播路线解锁
- 每个新回合开始时的 CSS 过场动画
- 事件图片占位区，方便后续补真实美术
- 本地 `localStorage` 存档

## 技术栈

- `vue`
- `vite`
- `typescript`
- `sass`
- `@vitejs/plugin-vue`
- `vue-tsc`

项目按需引入 Element Plus 的 Dialog 和 Popover，其他界面继续使用原生 Vue 组件和 SCSS，保留现有游戏美术风格。

### Element Plus 接入约定

- `src/components/ui/GameDialog.vue` 统一承载商店、日志、事件、结局弹窗，提供焦点管理、滚动锁定和弹窗语义。商店与日志允许 Esc / 点击遮罩关闭，事件与结局必须通过游戏操作继续。
- 状态与物品说明使用 Popover，支持点击、键盘操作和边缘自动定位，同时只展开一项说明。
- 只导入所用组件及其样式，不全局注册组件库。原有视觉样式保留在 `main.scss`，组件库适配集中在 `src/styles/element-plus.scss`。
- 层级沿用游戏约定：说明浮层 40、弹窗 50、回合过场 60。
- Element Plus 固定为 `2.13.5`，以兼容当前 Node 20 环境；升级时需同时核对间接依赖的 Node 要求。

### 屏幕适配

- 桌面手机外框根据视口高度调整宽高；小窗口和浏览器放大时，开始页与游戏内容可以独立滚动。
- 窄屏及触屏设备横屏使用全屏布局，隐藏装饰机身与模拟刘海；顶部、底部和横屏两侧预留系统安全区，保留浏览器缩放能力。
- 弹窗限制在可见区域内，长内容在弹窗中滚动；窄屏事件选项使用顶部编号，商店标题和关闭按钮并排排列。
- 跨组件适配规则集中在 `src/styles/responsive.scss`，触屏交互按钮的最小高度为 44px。

## 安装与启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

默认会由 Vite 启动本地开发服务器。

### 3. 类型检查 + 生产构建

```bash
npm run build
```

这个命令会先执行：

```bash
vue-tsc --noEmit
```

然后再执行 Vite 打包。

### 4. 本地预览构建结果

```bash
npm run preview
```

## 已安装 / 需要安装的依赖

`package.json` 中使用的依赖如下。

### 运行时依赖

- `vue`
- `element-plus`（按需使用 Dialog、Popover）

### 开发依赖

- `vite`
- `@vitejs/plugin-vue`
- `typescript`
- `sass`
- `vue-tsc`

## 项目结构

```text
.
├─ src/
│  ├─ components/
│  │  ├─ EndingModal.vue
│  │  ├─ EventModal.vue
│  │  ├─ RoundTransition.vue
│  │  ├─ ShopModal.vue
│  │  └─ StartScreen.vue
│  ├─ data/
│  │  └─ gameData.ts
│  ├─ engine/
│  │  └─ gameEngine.ts
│  ├─ styles/
│  │  └─ main.scss
│  ├─ App.vue
│  ├─ main.ts
│  └─ types.ts
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

## 实现流程说明

这部分是这次项目实际采用的开发顺序，后续如果你要继续扩内容，可以按这个顺序接着做。

### 1. 先把文档规则转成配置

先把两个文档里的以下内容拆到 `src/data/gameData.ts`：

- 行动
- 状态
- 商店道具
- 事件
- 结局

这样后面改平衡、加事件、换文案，都不需要去改页面结构。

### 2. 写统一结算引擎

`src/engine/gameEngine.ts` 负责整个核心流程：

1. 玩家点击行动
2. 执行基础行动数值
3. 套用状态 / 道具修饰
4. 按 A -> B -> C 优先级结算事件
5. 处理事件选项
6. 检查理智归零
7. 判断是否进入 40 周最终结局
8. 持久化存档

这样页面层只负责展示，不直接写复杂规则。

### 3. 再做 UI 结构

页面被拆成几个清晰模块：

- `StartScreen.vue`
  负责开场页和继续存档入口
- `ShopModal.vue`
  负责商店购买
- `EventModal.vue`
  负责事件弹窗和选项
- `EndingModal.vue`
  负责结局展示
- `RoundTransition.vue`
  负责每个新回合开始时的 CSS 过场

主界面在 `App.vue` 里把这些模块拼起来。

### 4. 最后统一做视觉

SCSS 放在 `src/styles/main.scss`，主要做了这些事情：

- 赛博杂志风的背景和氛围光斑
- 仪表盘式三栏布局
- 行动卡片、状态卡片、战报卡片
- 模态弹窗
- 回合切换动画
- 移动端适配

## 事件图片占位说明

当前所有事件图片都还是占位区，没有接真实图片资源。

现在有两处占位：

- 主界面中间的 `feature-frame__image`
- 事件弹窗中的 `event-visual__placeholder`

后续如果要替换成真实图片，建议做法：

1. 在 `src/data/gameData.ts` 里给事件增加真实图片路径字段
2. 在 `App.vue` 和 `EventModal.vue` 里把占位块替换成 `<img>`
3. 保留当前占位样式作为图片缺失 fallback

## 存档说明

项目使用浏览器 `localStorage` 存档，键名在：

```ts
cyber-fame-chronicle-save
```

刷新页面后可以继续当前进度。

## 后续扩展建议

- 补充真实事件图片与结局插画
- 增加更多直播专属 / 打工专属事件
- 给事件加入音效和更强的进场动画
- 把事件数值调优成更平衡的成长曲线
- 增加“图鉴 / 已解锁结局”页面

## 说明

当前仓库内已经写好了完整项目文件和依赖声明。

由于当前执行环境的网络安装审批超时，我这边没能在本机完成 `npm install` 和最终构建验证；如果你本地允许网络安装，直接执行：

```bash
npm install
npm run build
```

就可以完成依赖安装和构建检查。
