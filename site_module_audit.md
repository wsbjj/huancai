# Site Module Audit

来源文件：
- [index-1772524344345-ChF8viLm.js](C:/Users/acer/Downloads/魔镜-专注服装领域/demo/index-1772524344345-ChF8viLm.js)
- [data-userId=admin-1.json](C:/Users/acer/Downloads/魔镜-专注服装领域/demo/data-userId=admin-1.json)
- [data.json](C:/Users/acer/Downloads/魔镜-专注服装领域/demo/data.json)
- [1.json](C:/Users/acer/Downloads/魔镜-专注服装领域/demo/1.json)

说明：
- 大多数图片模块前端都统一调用 `https://vhkslk.cn/api/generate-image`，前端只暴露了业务 prompt 和输入字段，没有暴露底层图像模型名。
- `generatedResults.modelId` 在历史数据里表现为业务“模特 ID”，不是底层 AI 模型版本。
- 前端未检出 `LoRA`、`fine-tune`、`checkpoint`、训练开关等可见微调痕迹。
- `c17 AI对话` 是唯一能从前端直接确认模型名的模块。

| 分类ID | 模块名 | Prompt 来源 | Prompt 模板 / 规则 | 输入内容 | 输出内容 | 前端可见模型 / 接口 | 关键请求字段 | 微调 / 训练痕迹 | 点数规律 | 证据 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| c3 | 批量生图 | 硬编码默认 + 用户可改 | 默认：`帮我把这个衣服换到这个模特身上，保证模特的脸型、细节、姿势、等不做任何改变。 - 变体n/b`；可追加“面料特写” | 批量服装图、临时模特或已有模特照片、可选面料图、变体数、尺寸比例、自定义 prompt | 多张换装图，数量约等于模特数 x 服装数 x 变体数 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl`、`garmentImageBase64`、`fabricImageBase64`、`instruction`、`aspectRatio`、`originalWidth`、`originalHeight` | 未见 | 每生成 1 张图扣 1 点 | 历史记录里 `modelId` 常为 `temp-model`，指临时模特而非底模 |
| c4 | 平铺转3D | 硬编码默认 + 用户可改 | 默认是“完全复刻参考图2 的挂拍形态……”长 prompt；可用自定义 prompt 覆盖 | 平铺服装图、挂拍参考图或固定模板、尺寸比例、自定义 prompt | 每张输入图生成 1 张 3D / 挂拍效果图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 为平铺图，`garmentImageBase64` 为挂拍参考图，`instruction` 为挂拍 prompt | 未见 | 基本按输出张数扣点 | 历史 `originalPhotoId` 常见 `flat-lay-upload-*` |
| c5 | 裂变套图 | 硬编码默认 + 用户可改 | 默认：`图片A模仿图片B的姿势动作（要求动作姿态和状态一模一样）保证衣服的细节和人物的姿势以及脸，皮肤不会变化。`；另一路默认是“把这件衣服换到这个人的身上……” | 服装图、模特照片或临时模特、可选自定义 prompt、尺寸比例 | 多张动作 / 套图裂变图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 为主体图，`garmentImageBase64` 为服装图，`instruction` 为裂变 prompt | 未见 | 基本按输出张数扣点 | 历史 `originalPhotoId` 常见 `c5-model-*` |
| c7 | 换背景 | 代码动态生成 + 用户可改 | 默认：`将第一张图片的背景替换为第二张图片的背景... 背景相似度要求：X%`，相似度文案随滑杆变化 | 主体图 / 模特图、背景图、相似度滑杆、自定义 prompt、尺寸比例 | 换背景后的合成图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 为主体图，`backgroundImageBase64` 为背景图，`instruction` 为换背景 prompt | 未见 | 基本按输出张数扣点 | 历史 `originalPhotoId` 常见 `c7-model-*` |
| c8 | 生成细节 | 硬编码模板 + 自定义模板 | 按部位模板生成，如 `展示长裤缝线的细节...`、`展示衬衫领口的细节...`；支持自定义模板 | 白底商品图、细节模板多选、自定义模板、尺寸比例 | 多张细节特写图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 为主图，`instruction` 为细节模板 prompt | 未见 | 每张细节图约 1 点 | 还存在 `detail-references`、`custom-detail-templates`、`detail-generation-image` 配套 API |
| c9 | 历史记录 | 无 | 无生成 prompt | 无生成输入；读取各模块历史记录 | 展示 `generatedResults` 历史图 | `GET /api/generated-results` | 无生成字段 | 不适用 | 不扣点 | 展示模块，不是生成模块 |
| c11 | 买家秀制作 | 历史记录反推，前端逻辑与通用生成器共用 | 典型历史 prompt：`帮我把这件衣服穿到这个模特身上，不要改变衣服的细节和面料，不要改变模特的脸，我是作为买家秀在天猫和发小红书笔记，请给我一张好看的买家秀照片。` | 白底服装图、参考模特或临时模特 | 买家秀风格图 | 统一走 `https://vhkslk.cn/api/generate-image` | 由通用生成器拼 `imageUrl` + `garmentImageBase64` + `instruction` | 未见 | 历史数据表现为 1 图 1 点 | 默认 prompt 主要从历史数据反推，不是单独显式硬编码块 |
| c12 | 穿搭转平铺 | 硬编码默认 | 长 prompt，要求自动识别上衣 / 下装 / 鞋子 / 包包等并排成白底 `flat lay`，目标尺寸 `800x800` | 一张或多张穿搭 / 物品图 | 平铺搭配白底图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 为输入图，`instruction` 为固定长 prompt | 未见 | 每张输入图约 1 点 | 历史 `originalPhotoId` 常见 `uploaded-garment-*` |
| c14 | 模特图转白底 | 硬编码默认 | 分上衣 / 下装 / 鞋子三套 prompt，例如“将图片中的上衣部分提取出来……” | 模特图、部位选择（上衣 / 下装 / 鞋子） | 对应部位的白底产品图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 为模特图，`instruction` 为部位 prompt | 未见 | 每个部位约 1 点；全选约 3 点 | 历史里也有少量空 prompt 记录，说明早期数据可能不完整 |
| c15 | 整套穿搭 | 代码动态拼装 | `帮我把这个衣服换到这个模特身上...需要换上：上装 / 下装 / 内搭 / 鞋子...`，会根据上传内容追加约束 | 模特图、上装、下装、内搭、鞋子 / 包包饰品、尺寸比例 | 整套上身图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 主图、`garmentImageBase64` 上装、`fabricImageBase64` 下装、`innerWearImageBase64` 内搭、`backgroundImageBase64` 第一张鞋包附件 | 未见 | 基本按输出张数扣点 | 前端提示支持多张鞋包，但实际请求体只发送第一张附件；`data.json` 里该模块存在权限限制 |
| c17 | AI对话 | 用户输入 + 聊天历史拼接 | 无单独 system prompt；只把历史消息映射成 `contents` 传给模型 | 文本对话消息、历史消息 | 文本回答 | `https://api.qingyuntop.top/v1/models/gemini-3.1-flash-image-preview:generateContent` | `contents` | 未见 | 未见点数扣减逻辑 | 这是唯一前端可直接确认模型名的模块 |
| c19 | AI改款 | 用户输入 + 参考图规则追加 | 用户 prompt 原样发送；若上传参考图自动追加 `如果上传了参考图，需要一并参考参考图修改。` | 原图、文本 prompt、可选参考图、尺寸比例 | 改款结果图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 主图、`garmentImageBase64` 参考图、`instruction` 用户 prompt | 未见 | 每张图约 1 点 | 自由度最高，prompt 基本完全由用户决定 |
| c20 | 爆款裂变 | 代码动态生成 | 根据三个滑杆生成：`根据原图进行裂变调整：款式变化 / 颜色变化 / 图案变化...` | 原图、款式 / 颜色 / 图案三个强度滑杆、输出张数、尺寸比例 | 多张裂变图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl`、`instruction`、`aspectRatio`、`originalWidth`、`originalHeight` | 未见 | 每张输出图约 1 点 | 历史 `originalPhotoId` 常见 `burst-variation-upload-*` |
| c21 | 服装换料 | 硬编码默认 | `请将提供的面料应用到这件衣服上...只改变面料的颜色、图案、纹理等视觉特征` | 上装图若干、下装图若干、1 张面料图、尺寸比例 | 每件服装对应 1 张换料图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 服装图、`fabricImageBase64` 面料图、`instruction` 固定换料 prompt | 未见 | 每张输出图约 1 点 | 历史 `originalPhotoId` 常见 `fabric-change-top-*` / `fabric-change-bottom-*` |
| c22 | 高清放大 | 硬编码默认 | `在不改变构图、主体、颜色与风格的前提下，对图像进行高清增强和4K超分辨率放大...` | 多张输入图、尺寸比例 | 每张图 1 张高清结果图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageSize:"4K"`、`skipCompress:true`、`imageUrl`、`instruction` | 未见 | 每张输出图约 1 点 | 这是少数前端显式传 `imageSize` 的图片模块 |
| c23 | 复刻姿势 | 硬编码默认 + 用户可改 | 默认：`参考参考图的姿势和动作，做出一模一样的姿势和动作...只改变人物的姿势和动作。`；用户自定义 prompt 时会走原样 | 原图、参考姿势图、可选自定义 prompt | 姿势复刻图 | 统一走 `https://vhkslk.cn/api/generate-image` | `imageUrl` 原图、`garmentImageBase64` 参考姿势图、`instruction` prompt、`useRawPrompt` 在自定义 prompt 场景置真 | 未见 | 每张图约 1 点 | 是少数会显式切换 `useRawPrompt` 的模块 |
| hidden | 视频任务（未在当前主界面直接暴露） | 历史数据反推 | `videoPrompt` 为长文本分镜描述 | 参考图、分镜文本、可选参考视频信息 | 视频任务与视频 URL | 从 `data.json.videoTasks` 可见；错误日志提到 `sora2-pro-landscape-25s`、`sora2-pro-portrait-25s` | 历史数据字段含 `videoPrompt`、`apiTaskId`、`videoUrl` | 未见 | 数据里未直接给出统一扣点规则 | 属于隐藏 / 旁路功能，不在当前侧栏主路径 |

## 补充判断

| 项目 | 结论 |
| --- | --- |
| 底层图像模型名 | 前端不可见，无法从当前 JS / JSON 确认 |
| `modelId` 字段含义 | 在历史数据中更像业务模特 ID，不是底层 AI 模型 ID |
| 是否有微调 / LoRA / 训练配置 | 当前前端文件未发现相关开关或参数 |
| 通用生成接口 | 大部分图片模块都复用 `POST /api/generate-image` |
| 点数扣减方式 | 大体按输出图片张数扣点，历史记录与点数记录基本一致 |
