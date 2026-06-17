# 幻裁

幻裁是一套面向服装图片生产场景的 AI 工作台骨架，包含前端工作台、Fastify API、共享模块定义，以及统一的系统提示词配置中心。

## 当前能力

- 品牌与包名统一为 `幻裁` / `@huancai/*`
- 支持服装换装、买家秀、换背景、细节生成、AI 改款、爆款裂变、服装换料、高清放大、复刻姿势等模块
- 所有模块默认提示词已从前端硬编码中抽离，改为后端 JSON 持久化
- 前端提供全局“系统提示词”菜单，可随时编辑、保存、恢复默认
- 历史记录默认使用空数据种子，不再携带旧品牌演示内容

## 仓库结构

```text
.
├─ apps
│  ├─ api
│  │  ├─ src
│  │  ├─ data
│  │  └─ uploads
│  ├─ web
│  │  └─ src
│  ├─ data
│  └─ uploads
├─ packages
│  └─ shared
│     └─ src
└─ package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API 环境变量

```bash
cp apps/api/.env.example apps/api/.env
```

PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

至少需要配置可用的 AI 网关地址与密钥，例如：

```env
AI_GATEWAY_HTTP_URL=https://your-gateway.com/v1beta/models/gemini-2.5-flash-image:generateContent
AI_GATEWAY_HTTP_API_KEY=your_key
AI_GATEWAY_HTTP_PAYLOAD_MODE=nano-banana-generate-content
```

`AI_GATEWAY_HTTP_PAYLOAD_MODE` 支持两套 GetGoAPI / Apifox Gemini 接口格式：

- `nano-banana-generate-content`：Nano Banana / Gemini generateContent 多图模式，适合服装换装，发送 `inlineData` 图片。
- `gemini-image-generation-native`：Gemini Image Generation Native 文生图模式，发送纯文本 prompt，可配 `AI_GATEWAY_GEMINI_IMAGE_SIZE` 与 `AI_GATEWAY_GEMINI_NUMBER_OF_IMAGES`。

### 3. 启动开发环境

```bash
npm run dev
```

默认地址：

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

## 常用命令

```bash
npm run build:shared
npm run build:api
npm run build:web
npm run build
npm run typecheck
npm run dev:api
npm run dev:web
```

## 系统提示词

共享层在 `packages/shared/src/index.ts` 中维护以下统一配置：

- `SystemPromptConfig`
- `ModulePromptFieldSpec`
- `defaultSystemPromptConfig`
- `modulePromptFieldSpecs`

后端持久化文件：

- `apps/api/data/system-prompts.json`

接口：

- `GET /api/system/prompts`
- `PUT /api/system/prompts`
- `POST /api/system/prompts/reset`

说明：

- `c9` 历史记录模块不进入提示词菜单
- `allowEmpty=false` 的字段保存时不能为空
- `allowEmpty=true` 的字段允许保存空字符串，并在任务拼装时自动跳过

## 结果数据与上传目录

- 结果记录默认存放于 `apps/api/data/generated-results.json`
- 仓库内示例历史数据已重置为空
- `apps/api/uploads` 与 `apps/uploads` 中旧演示文件已清理

## 开发说明

- 前后端模块定义统一来自 `packages/shared/src/index.ts`
- 前端任务编排逻辑位于 `apps/web/src/lib/scaffold.ts`
- 工作台主界面位于 `apps/web/src/App.tsx`
- 系统提示词弹层位于 `apps/web/src/components/SystemPromptModal.tsx`
- 后端系统接口位于 `apps/api/src/routes/system.ts`
