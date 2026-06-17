export type ModuleId =
  | "c3"
  | "c4"
  | "c5"
  | "c7"
  | "c8"
  | "c9"
  | "c11"
  | "c12"
  | "c14"
  | "c15"
  | "c19"
  | "c20"
  | "c21"
  | "c22"
  | "c23";

export type ModuleSection = "商品上身" | "图片创作" | "其他";
export type ModulePhase = "phase-1" | "phase-2" | "platform";
export type ModuleScaffoldStatus = "interactive" | "placeholder" | "history";
export type ModuleUiMode =
  | "single"
  | "batch"
  | "multi-garment"
  | "template-driven"
  | "background-replace"
  | "detail-fanout"
  | "extract-to-white"
  | "edit"
  | "variation"
  | "fabric-swap"
  | "upscale"
  | "pose-copy"
  | "history";

export type FieldKind =
  | "image"
  | "image-multi"
  | "textarea"
  | "slider"
  | "ratio"
  | "count"
  | "check-group";

export type FieldRole =
  | "primary"
  | "garment"
  | "fabric"
  | "background"
  | "prompt"
  | "parts"
  | "templates"
  | "ratio"
  | "count"
  | "slider";

type FieldOption = {
  label: string;
  value: string;
};

type BaseField = {
  id: string;
  label: string;
  kind: FieldKind;
  role?: FieldRole;
  required?: boolean;
  helperText?: string;
};

export type ImageField = BaseField & {
  kind: "image" | "image-multi";
  accept?: string;
};

export type TextareaField = BaseField & {
  kind: "textarea";
  defaultValue?: string;
  placeholder?: string;
};

export type SliderField = BaseField & {
  kind: "slider";
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
};

export type RatioField = BaseField & {
  kind: "ratio";
  options: FieldOption[];
  defaultValue?: string;
};

export type CountField = BaseField & {
  kind: "count";
  min: number;
  max: number;
  defaultValue: number;
};

export type CheckGroupField = BaseField & {
  kind: "check-group";
  options: FieldOption[];
  defaultValue?: string[];
};

export type ScaffoldField =
  | ImageField
  | TextareaField
  | SliderField
  | RatioField
  | CountField
  | CheckGroupField;

export type ModuleDefinition = {
  id: ModuleId;
  name: string;
  section: ModuleSection;
  phase: ModulePhase;
  uiMode: ModuleUiMode;
  scaffoldStatus: ModuleScaffoldStatus;
  description: string;
  goal: string;
  fields: ScaffoldField[];
  taskMapping: string[];
};

export type GeneratedResultStatus =
  | "processing"
  | "completed"
  | "failed"
  | "timeout";

export type GeneratedResult = {
  id: string;
  originalPhotoId: string;
  originalImageUrl?: string;
  generatedImageUrl?: string;
  prompt: string;
  categoryId: ModuleId;
  modelId?: string;
  styleId?: string;
  status: GeneratedResultStatus;
  userId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateGeneratedResultInput = {
  originalPhotoId: string;
  originalImageUrl?: string;
  generatedImageUrl?: string;
  prompt: string;
  categoryId: ModuleId;
  modelId?: string;
  styleId?: string;
  status?: GeneratedResultStatus;
  userId?: string;
  pointCost?: number;
};

export type CreateGeneratedResultResponse = {
  result: GeneratedResult;
  remainingPoints: number;
};

export type GenerateImagePayload = {
  resultId: string;
  imageUrl: string;
  instruction: string;
  garmentImageBase64?: string;
  fabricImageBase64?: string;
  innerWearImageBase64?: string;
  backgroundImageBase64?: string;
  aspectRatio?: string;
  imageSize?: string;
  originalWidth?: number;
  originalHeight?: number;
  useRawPrompt?: boolean;
  skipCompress?: boolean;
};

export type GenerateImageRequest = GenerateImagePayload & {
  categoryId: ModuleId;
  originalPhotoId: string;
  originalImageUrl?: string;
};

export type GenerateImageResponse = {
  accepted: boolean;
  result: GeneratedResult;
};

export type PointsSnapshot = {
  userId: string;
  points: number;
};

export type SystemPromptModuleId = Exclude<ModuleId, "c9">;

export type ModulePromptFieldSpec = {
  key: string;
  label: string;
  helperText?: string;
  allowEmpty?: boolean;
  placeholders?: string[];
};

type DeepMutableStrings<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepMutableStrings<T[K]>;
};

const definePromptConfig = <
  T extends Record<SystemPromptModuleId, Record<string, string>>
>(
  config: T
): T => config;

export const defaultSystemPromptConfig = definePromptConfig({
  c3: {
    basePrompt:
      "帮我把这件衣服换到这个模特身上，保证模特的脸型、细节、姿势等不做任何改变。",
    fabricSuffix: "面料特写，让呈现出来的换装更清晰。",
    variantTemplate: "- 变体{{variant}}/{{variationCount}}"
  },
  c4: {
    withReferencePrompt: "完全复刻参考图的挂拍形态，保持服装结构和细节一致。",
    withoutReferencePrompt: "生成白底 3D 图，保持服装结构与材质细节真实。"
  },
  c5: {
    defaultPrompt: "图片A模仿图片B的姿势动作（要求动作姿态和状态一模一样）。",
    protectionSuffix: "保证衣服的细节和人物的姿势、脸部和皮肤不会变化。"
  },
  c7: {
    basePrompt:
      "将第一张图片的背景替换为第二张图片的背景，保持第一张图片的主体不变，背景自然融合。输出尺寸以上传主体图的尺寸输出，不能改变主体大小。",
    highSimilarityTemplate: "背景相似度要求：{{similarity}}%，尽可能保持背景的细节和特征。",
    normalSimilarityTemplate: "背景相似度要求：{{similarity}}%，适度融合背景。"
  },
  c8: {
    seamTemplate:
      "展示长裤缝线的细节，包括缝线工艺、走线方式和线迹细节，保持白底背景，专业拍摄，高清细节。",
    pocketTemplate:
      "展示长裤口袋的细节，包括口袋形状、开口方式和缝线处理，保持白底背景，专业拍摄，高清细节。",
    collarTemplate:
      "展示衬衫领口的细节，包括领型、缝线和结构细节，保持白底背景，专业拍摄，高清细节。",
    cuffTemplate:
      "展示袖口的细节，包括袖口结构、缝线与面料纹理，保持白底背景，专业拍摄，高清细节。",
    fallbackTemplate: "展示商品关键细节，保持白底背景，专业拍摄，高清细节。"
  },
  c11: {
    basePrompt:
      "帮我把这件衣服穿到这个模特身上，不要改变衣服的细节和面料，不要改变模特的脸，我是作为买家秀在天猫和发小红书笔记，请给我一张好看的买家秀照片。"
  },
  c12: {
    basePrompt:
      "请自动识别图中的服装与配饰，拆解主要单品，并以纯白背景平铺方式输出。请保持服装结构、颜色和材质细节，输出适合电商展示的清晰平铺图。"
  },
  c14: {
    topPrompt:
      "将图片中的上衣部分提取出来，只提取最外层穿着的上衣，不要包括衣架、里面的衣服、配饰等其他物品。生成纯白背景的产品图，保持服装的细节和质感，专业拍摄，高清效果。",
    bottomPrompt:
      "将图片中的下装部分提取出来，只提取最外层穿着的下装（裤子或裙子），不要包括衣架、里面的衣服、配饰等其他物品。生成纯白背景的产品图，保持服装的细节和质感，专业拍摄，高清效果。",
    shoesPrompt:
      "将图片中的鞋子部分提取出来，只提取脚上穿着的鞋子，不要包括其他物品。生成纯白背景的产品图，保持鞋子的细节和质感，专业拍摄，高清效果。"
  },
  c15: {
    basePrompt:
      "帮我把这些服装穿到这个模特身上，保证模特的脸型、细节、姿势等不做任何改变。",
    selectedPartsTemplate: "需要换上：{{selectedParts}}。",
    innerWearSuffix: "内搭必须保持原样，必须使用我上传的内搭图片。",
    accessoriesSuffix: "鞋包搭配请参考我上传的鞋子/包包饰品。",
    qualitySuffix:
      "保证第一张图片的模特脸部、表情、姿势、眼神等所有细节不做变动，4K，专业拍摄，大片质感。"
  },
  c19: {
    referenceSuffix: "如果上传了参考图，需要一并参考参考图修改。"
  },
  c20: {
    instructionTemplate:
      "根据原图进行裂变调整：\n款式变化：{{styleLabel}}\n颜色变化：{{colorLabel}}\n图案变化：{{patternLabel}}\n必须保持脸部、表情、眼神、姿势、背景和整体构图不变。\n只允许对服装进行变化。",
    styleLabelKeep: "几乎保持原款式",
    styleLabelLow: "细微改变款式",
    styleLabelMedium: "适度改变款式",
    styleLabelHigh: "明显改变款式",
    colorLabelKeep: "几乎保持原颜色",
    colorLabelLow: "细微改变颜色",
    colorLabelMedium: "适度改变颜色",
    colorLabelHigh: "明显改变颜色",
    colorLabelMax: "大幅改变颜色",
    patternLabelKeep: "几乎保持原图案",
    patternLabelLow: "细微改变图案",
    patternLabelMedium: "适度改变图案",
    patternLabelHigh: "明显改变图案",
    patternLabelMax: "大幅改变图案"
  },
  c21: {
    basePrompt: `请将提供的面料应用到这件衣服上，改变衣服的颜色或风格，但保持衣服的版型、款式、细节等其他部分完全不变。
要求：
1. 替换原有面料；
2. 保持版型、剪裁、设计不变；
3. 保持纽扣、拉链、口袋、装饰等细节位置和样式不变；
4. 只改变颜色、图案、纹理等视觉特征；
5. 输出专业电商图。`
  },
  c22: {
    basePrompt:
      "在不改变构图、主体、颜色与风格的前提下，对图像进行高清增强和 4K 超分辨率放大，抑制噪点与伪影，提升边缘锐度与纹理细节，保持自然质感与真实光影。"
  },
  c23: {
    defaultPrompt:
      "参考参考图的姿势和动作，做出一模一样的姿势和动作，不能改变人物的衣服和衣服细节。保持原图的所有服装细节、颜色、纹理和设计不变，只改变人物的姿势和动作。"
  }
});

export type SystemPromptConfig = DeepMutableStrings<typeof defaultSystemPromptConfig>;

export type SystemPromptPayload = {
  prompts: SystemPromptConfig;
};

export type ResetSystemPromptInput = {
  moduleId?: SystemPromptModuleId;
};

export const cloneSystemPromptConfig = (
  config: SystemPromptConfig = defaultSystemPromptConfig
): SystemPromptConfig =>
  Object.fromEntries(
    Object.entries(config).map(([moduleId, prompts]) => [moduleId, { ...prompts }])
  ) as SystemPromptConfig;

export const createDefaultSystemPromptConfig = (): SystemPromptConfig =>
  cloneSystemPromptConfig(defaultSystemPromptConfig);

export const systemPromptModuleIds = Object.keys(
  defaultSystemPromptConfig
) as SystemPromptModuleId[];

export const modulePromptFieldSpecs: Record<SystemPromptModuleId, ModulePromptFieldSpec[]> = {
  c3: [
    { key: "basePrompt", label: "基础提示词" },
    {
      key: "fabricSuffix",
      label: "面料补充语",
      helperText: "上传面料图时会自动追加；可留空。",
      allowEmpty: true
    },
    {
      key: "variantTemplate",
      label: "变体模板",
      helperText: "用于每个变体任务的后缀。",
      placeholders: ["{{variant}}", "{{variationCount}}"]
    }
  ],
  c4: [
    { key: "withReferencePrompt", label: "带参考图提示词" },
    { key: "withoutReferencePrompt", label: "无参考图提示词" }
  ],
  c5: [
    { key: "defaultPrompt", label: "默认提示词" },
    { key: "protectionSuffix", label: "保护补充语" }
  ],
  c7: [
    { key: "basePrompt", label: "基础提示词" },
    {
      key: "highSimilarityTemplate",
      label: "高相似度模板",
      placeholders: ["{{similarity}}"]
    },
    {
      key: "normalSimilarityTemplate",
      label: "常规相似度模板",
      placeholders: ["{{similarity}}"]
    }
  ],
  c8: [
    { key: "seamTemplate", label: "缝线模板" },
    { key: "pocketTemplate", label: "口袋模板" },
    { key: "collarTemplate", label: "领口模板" },
    { key: "cuffTemplate", label: "袖口模板" },
    { key: "fallbackTemplate", label: "兜底模板" }
  ],
  c11: [{ key: "basePrompt", label: "基础提示词" }],
  c12: [{ key: "basePrompt", label: "基础提示词" }],
  c14: [
    { key: "topPrompt", label: "上衣提示词" },
    { key: "bottomPrompt", label: "下装提示词" },
    { key: "shoesPrompt", label: "鞋子提示词" }
  ],
  c15: [
    { key: "basePrompt", label: "基础提示词" },
    {
      key: "selectedPartsTemplate",
      label: "已选单品模板",
      placeholders: ["{{selectedParts}}"]
    },
    {
      key: "innerWearSuffix",
      label: "内搭补充语",
      helperText: "上传内搭图时会自动追加；可留空。",
      allowEmpty: true
    },
    {
      key: "accessoriesSuffix",
      label: "鞋包补充语",
      helperText: "上传鞋包饰品时会自动追加；可留空。",
      allowEmpty: true
    },
    { key: "qualitySuffix", label: "画质补充语" }
  ],
  c19: [
    {
      key: "referenceSuffix",
      label: "参考图补充语",
      helperText: "上传参考图时会自动追加；可留空。",
      allowEmpty: true
    }
  ],
  c20: [
    {
      key: "instructionTemplate",
      label: "裂变提示词模板",
      placeholders: ["{{styleLabel}}", "{{colorLabel}}", "{{patternLabel}}"]
    },
    { key: "styleLabelKeep", label: "款式文案 - 保持" },
    { key: "styleLabelLow", label: "款式文案 - 低变化" },
    { key: "styleLabelMedium", label: "款式文案 - 中变化" },
    { key: "styleLabelHigh", label: "款式文案 - 高变化" },
    { key: "colorLabelKeep", label: "颜色文案 - 保持" },
    { key: "colorLabelLow", label: "颜色文案 - 低变化" },
    { key: "colorLabelMedium", label: "颜色文案 - 中变化" },
    { key: "colorLabelHigh", label: "颜色文案 - 高变化" },
    { key: "colorLabelMax", label: "颜色文案 - 极高变化" },
    { key: "patternLabelKeep", label: "图案文案 - 保持" },
    { key: "patternLabelLow", label: "图案文案 - 低变化" },
    { key: "patternLabelMedium", label: "图案文案 - 中变化" },
    { key: "patternLabelHigh", label: "图案文案 - 高变化" },
    { key: "patternLabelMax", label: "图案文案 - 极高变化" }
  ],
  c21: [{ key: "basePrompt", label: "基础提示词" }],
  c22: [{ key: "basePrompt", label: "基础提示词" }],
  c23: [{ key: "defaultPrompt", label: "默认提示词" }]
};

export const aspectRatioOptions: FieldOption[] = [
  { label: "1:1", value: "1:1" },
  { label: "5:4", value: "5:4" },
  { label: "3:4", value: "3:4" },
  { label: "4:3", value: "4:3" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" }
];

const partOptions: FieldOption[] = [
  { label: "上衣", value: "top" },
  { label: "下装", value: "bottom" },
  { label: "鞋子", value: "shoes" }
];

const detailTemplateOptions: FieldOption[] = [
  { label: "缝线", value: "seam" },
  { label: "口袋", value: "pocket" },
  { label: "领口", value: "collar" },
  { label: "袖口", value: "cuff" }
];

export const moduleDefinitions: ModuleDefinition[] = [
  {
    id: "c3",
    name: "批量生图",
    section: "商品上身",
    phase: "phase-1",
    uiMode: "batch",
    scaffoldStatus: "interactive",
    description: "上传多张 SKU 与模特图，自动拆成批量换装任务。",
    goal: "验证批量拆任务、点数扣减和结果轮询。",
    fields: [
      {
        id: "skuImages",
        label: "SKU 图片",
        kind: "image-multi",
        role: "garment",
        required: true
      },
      {
        id: "modelImages",
        label: "模特图片",
        kind: "image-multi",
        role: "primary",
        required: true
      },
      { id: "fabricImage", label: "面料图", kind: "image", role: "fabric" },
      {
        id: "customPrompt",
        label: "自定义提示词",
        kind: "textarea",
        role: "prompt",
        placeholder: "可选"
      },
      {
        id: "variationCount",
        label: "变体数量",
        kind: "count",
        role: "count",
        min: 1,
        max: 10,
        defaultValue: 3
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: [
      "imageUrl = 模特图",
      "garmentImageBase64 = SKU 图",
      "fabricImageBase64 = 面料图"
    ]
  },
  {
    id: "c15",
    name: "整套穿搭",
    section: "商品上身",
    phase: "phase-1",
    uiMode: "multi-garment",
    scaffoldStatus: "interactive",
    description: "把上装、下装、内搭、鞋包一次性穿到同一位模特上。",
    goal: "验证多图字段映射和动态提示词拼装。",
    fields: [
      { id: "modelImage", label: "模特图", kind: "image", role: "primary", required: true },
      { id: "topImage", label: "上装", kind: "image", role: "garment" },
      { id: "bottomImage", label: "下装", kind: "image", role: "garment" },
      { id: "innerWearImage", label: "内搭", kind: "image", role: "garment" },
      {
        id: "shoesBagImages",
        label: "鞋子/包包饰品",
        kind: "image-multi",
        role: "background"
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: [
      "imageUrl = 模特图",
      "garmentImageBase64 = 上装",
      "fabricImageBase64 = 下装",
      "innerWearImageBase64 = 内搭",
      "backgroundImageBase64 = 鞋包图首张"
    ]
  },
  {
    id: "c11",
    name: "买家秀制作",
    section: "商品上身",
    phase: "phase-1",
    uiMode: "single",
    scaffoldStatus: "interactive",
    description: "将白底商品图套到参考人物上，输出电商买家秀图。",
    goal: "打通买家秀换装主流程。",
    fields: [
      {
        id: "garmentImage",
        label: "白底商品图",
        kind: "image",
        role: "garment",
        required: true
      },
      { id: "referenceImage", label: "参考照片", kind: "image", role: "primary" },
      { id: "tempModelImages", label: "临时模特", kind: "image-multi", role: "primary" },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: [
      "imageUrl = 参考照片或临时模特",
      "garmentImageBase64 = 商品图",
      "instruction = 买家秀固定 prompt"
    ]
  },
  {
    id: "c4",
    name: "平铺转3D",
    section: "图片创作",
    phase: "phase-1",
    uiMode: "template-driven",
    scaffoldStatus: "interactive",
    description: "把平铺图或挂拍图转换成真人上身效果。",
    goal: "验证模板参考与平铺转上身链路。",
    fields: [
      { id: "flatlayImage", label: "平铺图", kind: "image", role: "primary", required: true },
      { id: "referenceImage", label: "参考挂拍图", kind: "image", role: "garment" },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: ["imageUrl = 平铺图", "garmentImageBase64 = 挂拍图/模板图"]
  },
  {
    id: "c5",
    name: "裂变套图",
    section: "图片创作",
    phase: "phase-1",
    uiMode: "batch",
    scaffoldStatus: "interactive",
    description: "基于一张效果图生成多角度多场景裂变图。",
    goal: "验证参考图驱动的批量生成。",
    fields: [
      { id: "effectImage", label: "效果图", kind: "image", role: "garment", required: true },
      {
        id: "referenceModels",
        label: "参考模特",
        kind: "image-multi",
        role: "primary",
        required: true
      },
      {
        id: "customPrompt",
        label: "自定义提示词",
        kind: "textarea",
        role: "prompt",
        placeholder: "可选"
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: [
      "imageUrl = 模特图",
      "garmentImageBase64 = 效果图",
      "instruction = 裂变 prompt"
    ]
  },
  {
    id: "c7",
    name: "换背景",
    section: "图片创作",
    phase: "phase-1",
    uiMode: "background-replace",
    scaffoldStatus: "interactive",
    description: "替换主体图背景并保持主体不变。",
    goal: "打通换背景闭环。",
    fields: [
      { id: "subjectImage", label: "主体图", kind: "image", role: "primary", required: true },
      {
        id: "backgroundImage",
        label: "背景图",
        kind: "image",
        role: "background",
        required: true
      },
      {
        id: "similarity",
        label: "背景相似度",
        kind: "slider",
        role: "slider",
        min: 0,
        max: 100,
        defaultValue: 50
      },
      {
        id: "customPrompt",
        label: "自定义提示词",
        kind: "textarea",
        role: "prompt",
        placeholder: "可选"
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: [
      "imageUrl = 主体图",
      "backgroundImageBase64 = 背景图",
      "instruction = 换背景 prompt"
    ]
  },
  {
    id: "c8",
    name: "生成细节",
    section: "图片创作",
    phase: "phase-1",
    uiMode: "detail-fanout",
    scaffoldStatus: "interactive",
    description: "按模板批量生成口袋、走线、领口等细节图。",
    goal: "验证模板扇出式多任务生成。",
    fields: [
      { id: "productImage", label: "商品图", kind: "image", role: "primary", required: true },
      {
        id: "detailTemplates",
        label: "细节模板",
        kind: "check-group",
        role: "templates",
        required: true,
        options: detailTemplateOptions,
        defaultValue: ["seam"]
      },
      {
        id: "customTemplates",
        label: "自定义细节模板",
        kind: "textarea",
        role: "templates",
        placeholder: "可选；每行一条模板描述"
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: ["imageUrl = 商品图", "instruction = 模板 prompt"]
  },
  {
    id: "c12",
    name: "穿搭转平铺",
    section: "图片创作",
    phase: "phase-1",
    uiMode: "single",
    scaffoldStatus: "interactive",
    description: "把穿搭图拆成纯白背景平铺图。",
    goal: "验证固定 prompt 与单图批量。",
    fields: [
      {
        id: "outfitImages",
        label: "穿搭图",
        kind: "image-multi",
        role: "primary",
        required: true
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: ["imageUrl = 穿搭图", "instruction = 固定穿搭转平铺 prompt"]
  },
  {
    id: "c14",
    name: "模特图转白底",
    section: "图片创作",
    phase: "phase-1",
    uiMode: "extract-to-white",
    scaffoldStatus: "interactive",
    description: "从模特图提取上衣/下装/鞋子并输出白底图。",
    goal: "验证按部位拆任务。",
    fields: [
      { id: "modelImage", label: "模特图", kind: "image", role: "primary", required: true },
      {
        id: "parts",
        label: "提取部位",
        kind: "check-group",
        role: "parts",
        required: true,
        options: partOptions,
        defaultValue: ["top"]
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: ["imageUrl = 模特图", "instruction = 部位专属白底提取 prompt"]
  },
  {
    id: "c19",
    name: "AI改款",
    section: "图片创作",
    phase: "phase-1",
    uiMode: "edit",
    scaffoldStatus: "interactive",
    description: "根据文字要求和参考图做定向改版。",
    goal: "保留开放式图片编辑能力。",
    fields: [
      { id: "targetImage", label: "目标图", kind: "image", role: "primary", required: true },
      { id: "referenceImage", label: "参考图", kind: "image", role: "garment" },
      {
        id: "prompt",
        label: "改款提示词",
        kind: "textarea",
        role: "prompt",
        required: true,
        placeholder: "例如：把连衣裙改成短袖、收腰、米白色"
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: ["imageUrl = 目标图", "garmentImageBase64 = 参考图", "instruction = 用户 prompt"]
  },
  {
    id: "c20",
    name: "爆款裂变",
    section: "图片创作",
    phase: "phase-2",
    uiMode: "variation",
    scaffoldStatus: "interactive",
    description: "按款式/颜色/图案强度裂变生成多图。",
    goal: "验证参数驱动型批量任务。",
    fields: [
      { id: "sourceImage", label: "原图", kind: "image", role: "primary", required: true },
      {
        id: "styleStrength",
        label: "款式变化",
        kind: "slider",
        role: "slider",
        min: 0,
        max: 100,
        defaultValue: 50
      },
      {
        id: "colorStrength",
        label: "颜色变化",
        kind: "slider",
        role: "slider",
        min: 0,
        max: 100,
        defaultValue: 100
      },
      {
        id: "patternStrength",
        label: "图案变化",
        kind: "slider",
        role: "slider",
        min: 0,
        max: 100,
        defaultValue: 100
      },
      {
        id: "resultCount",
        label: "生成数量",
        kind: "count",
        role: "count",
        min: 1,
        max: 10,
        defaultValue: 3
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: ["imageUrl = 原图", "instruction = 三滑杆动态 prompt"]
  },
  {
    id: "c21",
    name: "服装换料",
    section: "图片创作",
    phase: "phase-2",
    uiMode: "fabric-swap",
    scaffoldStatus: "interactive",
    description: "把面料图应用到上装/下装图片。",
    goal: "验证一拖多换料任务。",
    fields: [
      { id: "topImages", label: "上装", kind: "image-multi", role: "primary" },
      { id: "bottomImages", label: "下装", kind: "image-multi", role: "primary" },
      {
        id: "fabricImage",
        label: "面料图",
        kind: "image",
        role: "fabric",
        required: true
      },
      {
        id: "customPrompt",
        label: "自定义提示词",
        kind: "textarea",
        role: "prompt",
        placeholder: "当前版本保留输入框，但默认走固定换料 prompt"
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: ["imageUrl = 单件服装图", "fabricImageBase64 = 面料图", "instruction = 固定换料 prompt"]
  },
  {
    id: "c22",
    name: "高清放大",
    section: "图片创作",
    phase: "phase-2",
    uiMode: "upscale",
    scaffoldStatus: "interactive",
    description: "对图片做高清增强与 4K 放大。",
    goal: "验证 4K 专用增强链路。",
    fields: [
      {
        id: "sourceImages",
        label: "原图",
        kind: "image-multi",
        role: "primary",
        required: true
      },
      {
        id: "aspectRatio",
        label: "输出比例",
        kind: "ratio",
        role: "ratio",
        options: aspectRatioOptions
      }
    ],
    taskMapping: [
      "imageUrl = 原图",
      "instruction = 固定 4K prompt",
      "imageSize = 4K",
      "skipCompress = true"
    ]
  },
  {
    id: "c23",
    name: "复刻姿势",
    section: "图片创作",
    phase: "phase-2",
    uiMode: "pose-copy",
    scaffoldStatus: "interactive",
    description: "复刻参考人物姿势，同时保持原人物身份和服装细节。",
    goal: "验证默认模板与自定义 prompt 双模式。",
    fields: [
      {
        id: "personImage",
        label: "人物图",
        kind: "image",
        role: "primary",
        required: true
      },
      {
        id: "referencePoseImage",
        label: "参考人物图",
        kind: "image",
        role: "garment"
      },
      {
        id: "customPrompt",
        label: "自定义提示词",
        kind: "textarea",
        role: "prompt",
        placeholder: "不填则使用默认复刻姿势 prompt"
      }
    ],
    taskMapping: [
      "imageUrl = 人物图",
      "garmentImageBase64 = 参考人物图",
      "useRawPrompt = 自定义提示词时为 true"
    ]
  },
  {
    id: "c9",
    name: "历史记录",
    section: "其他",
    phase: "platform",
    uiMode: "history",
    scaffoldStatus: "history",
    description: "集中查看全部模块结果，支持筛选、删除、批量下载。",
    goal: "作为平台基础能力优先交付。",
    fields: [],
    taskMapping: ["GET /api/generated-results", "DELETE /api/generated-results/:id"]
  }
];

export const moduleDefinitionMap = Object.fromEntries(
  moduleDefinitions.map((moduleDefinition) => [moduleDefinition.id, moduleDefinition])
) as Record<ModuleId, ModuleDefinition>;

export const moduleSectionOrder: ModuleSection[] = ["商品上身", "图片创作", "其他"];

export const defaultPoints = 120;

export const seedGeneratedResults: GeneratedResult[] = [];

export const resolveModuleName = (moduleId: ModuleId): string =>
  moduleDefinitionMap[moduleId]?.name ?? moduleId;
