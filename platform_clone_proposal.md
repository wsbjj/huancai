# 平台搭建提案

## 目标与背景

目标：基于当前已拆解出的“魔镜”前端行为与接口模式，搭建一个同类平台，覆盖以下核心能力：

- 图片生成类功能
  - 批量生图
  - 平铺转 3D
  - 裂变套图
  - 换背景
  - 生成细节
  - 买家秀制作
  - 穿搭转平铺
  - 模特图转白底
  - 整套穿搭
  - AI 改款
  - 爆款裂变
  - 服装换料
  - 高清放大
  - 复刻姿势
- 文本对话类功能
  - AI 对话
- 平台能力
  - 登录注册
  - 点数体系
  - 历史记录
  - 用户 / 管理后台
  - 分类权限控制

当前已知的“魔镜式”技术模式：

- 前端是单页 React 应用
- 后端以统一图片生成接口为中心：`POST /api/generate-image`
- 前端通过上传图片 + 传 `instruction` + 若干参考图字段驱动不同功能
- 历史记录统一落到 `generated-results`
- 点数在“创建 processing 记录”时扣减
- 模块差异主要体现在：
  - prompt 组装规则
  - 输入图片组合方式
  - 输出张数
  - 点数消耗

结论：最合理的复刻方式不是为每个功能单独做一套后端，而是复用一个“任务网关 + 模块化 prompt/参数编排层”的架构。

## 建议架构

### 1. 前端

建议：

- `React + Vite + TypeScript`
- UI 保持单页工作台模式
- 左侧分类导航，右侧为模块表单 + 结果区
- 统一上传组件、统一历史记录组件、统一点数状态管理

前端职责：

- 收集模块输入
- 拼接 prompt
- 预上传图片
- 调用统一任务接口
- 轮询任务状态
- 展示历史记录和点数变化

### 2. 后端

建议：

- `Node.js + TypeScript + Fastify` 或 `NestJS`
- 模块化拆分：
  - `auth`
  - `users`
  - `points`
  - `categories`
  - `generated-results`
  - `ai-tasks`
  - `uploads`
  - `admin`
  - `payments`

后端核心模式：

- `POST /api/generated-results`
  - 创建 processing 记录
  - 校验并扣点
- `POST /api/generate-image`
  - 接收统一任务结构
  - 写入任务队列
  - 转发到底层 AI 服务
- `GET /api/generated-results`
  - 查询历史记录 / 轮询状态
- `POST /api/uploads/...`
  - 文件上传

### 3. 数据层

建议：

- 开发期：`PostgreSQL + Prisma`
- 文件：本地存储或兼容 S3 的对象存储
- 任务队列：`BullMQ + Redis`

核心数据表：

- `users`
- `admin_accounts`
- `categories`
- `category_permissions`
- `generated_results`
- `point_usage_records`
- `recharge_orders`
- `pose_references`
- `detail_references`
- `custom_detail_templates`

### 4. AI 能力接入层

建议抽象一层 `AI Gateway`，不要把平台直接绑定某一家模型供应商。

统一输入结构：

- `imageUrl`
- `instruction`
- `garmentImageUrl`
- `fabricImageUrl`
- `innerWearImageUrl`
- `backgroundImageUrl`
- `aspectRatio`
- `imageSize`
- `originalWidth`
- `originalHeight`
- `useRawPrompt`
- `skipCompress`

这样可以做到：

- 前端不关心底层模型
- 后端按模块选择模型路由
- 后续可切换 `Flux / SDXL / ComfyUI / 自研工作流 / 第三方图像 API`

## 交付策略

说明：

- 当前规格文档已覆盖 `15` 个模块
- 其中 `14` 个是生成 / 编辑模块，`c9` 历史记录属于平台基础工作台模块
- 下面的阶段划分仍建议按交付复杂度推进，而不是按“是否已有规格”推进

### 阶段 1：服装工作台 MVP

优先做你当前已经明确要求的 10 个服装核心模块，并同时补齐平台基础能力。

平台基础能力：

- 登录注册
- 点数体系
- `c9` 历史记录
- 上传中心
- 分类与权限控制

首期模块范围：

- `c11` 买家秀制作
- `c7` 换背景
- `c14` 模特图转白底
- `c19` AI改款
- `c3` 批量生图
- `c8` 生成细节
- `c12` 穿搭转平铺
- `c15` 整套穿搭
- `c4` 平铺转 3D
- `c5` 裂变套图

理由：

- 这 10 个模块都已经能映射到统一 `generate-image` 任务架构
- 已经覆盖服装工作台里最核心的编辑、换装、扇出和组合能力
- 可以直接验证“模块配置化 + 统一任务网关”的设计是否成立
- `c9` 历史记录应和 `generated-results` 数据层一起首期交付

### 阶段 2：能力增强模块

- 服装换料
- 爆款裂变
- 高清放大
- 复刻姿势

原因：

- 这些模块同样适合放在统一架构里
- 虽然现在规格已经补齐，但它们更依赖批量扇出、点数扣减和专用模型路由
- 放在第二阶段更利于先稳定首期工作台闭环

### 阶段 3：平台扩展层

- AI 对话
- 支付充值
- 后台审核运营
- 模板库精细化管理

原因：

- 这些更偏平台化能力，不影响首批服装工作台上线
- 更适合在图像链路稳定后再逐步接入

## 我建议的“同类技术架构”落地方式

不是照抄当前站点的打包前端，而是保留其架构思想：

1. 前端统一工作台
2. 后端统一任务网关
3. 模块只定义“输入规则 + prompt 规则 + 点数规则”
4. 底层模型通过 AI Gateway 解耦
5. 所有结果统一入历史记录

模块配置建议做成代码配置，而不是散落在组件里：

```ts
type ModuleDefinition = {
  id: string;
  name: string;
  pointCost: number | ((input: unknown) => number);
  buildPrompt: (input: unknown) => string | string[];
  buildTaskPayload: (input: unknown) => GenerateImagePayload[];
};
```

好处：

- 新增功能成本低
- prompt 可版本化
- 点数规则可统一管理
- 后续可做 AB 测试

## 风险与缓解

### 1. 最大风险：底层模型效果无法直接复刻

原因：

- 当前前端看不到魔镜底层用的具体图像模型和工作流
- 同样的 prompt 接到不同模型，结果差异会很大

缓解：

- 平台先复刻“交互与任务架构”
- 模型能力单独抽象
- 每个模块单独调 prompt 和模型路由

### 2. 多图组合模块复杂度高

比如：

- 整套穿搭
- 平铺转 3D
- 裂变套图
- 穿搭转平铺

缓解：

- 在第一期内部按顺序推进，不一起并行开工
- 每个模块先做最小闭环版本

### 3. 点数与支付属于平台级风险

缓解：

- 先做手工充值 / 后台加点
- 支付放到后续阶段再接

## 建议本次确认项

请先确认下面 4 个决策：

1. 是否按“分阶段交付”推进，而不是一次性做全量
2. 后端是否采用 `Node.js + TypeScript + PostgreSQL + Redis`
3. 首期是否先做“10 个核心生成模块 + `c9` 历史记录”
4. 底层图像能力是否先接一个统一占位网关，后续再替换真实模型

## 确认后我会做什么

如果你确认，我下一步会直接开始搭项目骨架：

1. 初始化前后端目录结构
2. 设计数据库 schema
3. 落统一任务接口与历史记录接口
4. 先完成登录 / 点数 / 上传 / 历史记录
5. 先接入 `c9 + 4` 个基础模块打通闭环，再逐步扩展到 10 个核心模块与第二阶段增强模块
