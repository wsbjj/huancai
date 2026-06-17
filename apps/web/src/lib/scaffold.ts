import type {
  GenerateImageRequest,
  ModuleDefinition,
  ModuleId,
  SystemPromptConfig
} from "@huancai/shared";

type FormState = Record<string, unknown>;

export type PreparedTask = Omit<GenerateImageRequest, "resultId"> & {
  pointCost: number;
};

const asFileArray = (value: unknown): File[] => {
  if (value instanceof File) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is File => entry instanceof File);
  }

  return [];
};

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`读取文件失败: ${file.name}`));
    reader.readAsDataURL(file);
  });

const firstImage = async (value: unknown): Promise<string | undefined> => {
  const [first] = asFileArray(value);
  if (!first) {
    return undefined;
  }
  return readAsDataUrl(first);
};

const allImages = async (value: unknown): Promise<string[]> =>
  Promise.all(asFileArray(value).map((file) => readAsDataUrl(file)));

const asText = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
};

const asMultilineTextArray = (value: unknown): string[] =>
  asText(value)
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const clampInt = (value: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(value), min), max);

const required = (value: string | undefined, label: string): string => {
  if (!value) {
    throw new Error(`缺少必填字段：${label}`);
  }
  return value;
};

const withAspectRatio = (value: unknown): string | undefined => {
  const ratio = asText(value);
  return ratio || undefined;
};

const interpolateTemplate = (
  template: string,
  values: Record<string, string | number>
): string => {
  let next = template;
  for (const [key, value] of Object.entries(values)) {
    next = next.replaceAll(`{{${key}}}`, String(value));
  }
  return next;
};

const joinPromptSegments = (segments: Array<string | undefined>): string =>
  segments
    .map((segment) => (segment ?? "").trim())
    .filter(Boolean)
    .join("\n");

const buildBurstLabel = (
  value: number,
  thresholds: Array<[number, string]>,
  fallback: string
): string => {
  for (const [threshold, label] of thresholds) {
    if (value >= threshold) {
      return label;
    }
  }
  return fallback;
};

const prepareSingleTask = async (
  moduleId: ModuleId,
  formState: FormState,
  instruction: string
): Promise<PreparedTask> => {
  const imageUrl = required(
    await firstImage(
      formState.primaryImage ??
        formState.targetImage ??
        formState.subjectImage ??
        formState.personImage ??
        formState.modelImage ??
        formState.sourceImage ??
        formState.referenceImage
    ),
    "主图"
  );

  const garmentImageBase64 = await firstImage(
    formState.referenceImage ?? formState.referencePoseImage ?? formState.garmentImage
  );
  const fabricImageBase64 = await firstImage(formState.fabricImage);
  const backgroundImageBase64 = await firstImage(formState.backgroundImage);

  return {
    categoryId: moduleId,
    originalPhotoId: `${moduleId}-${Date.now()}`,
    originalImageUrl: imageUrl,
    imageUrl,
    instruction,
    garmentImageBase64,
    fabricImageBase64,
    backgroundImageBase64,
    aspectRatio: withAspectRatio(formState.aspectRatio),
    pointCost: 1
  };
};

export const buildTasksForModule = async (
  module: ModuleDefinition,
  formState: FormState,
  systemPrompts: SystemPromptConfig
): Promise<PreparedTask[]> => {
  switch (module.id) {
    case "c3": {
      const prompts = systemPrompts.c3;
      const skuImages = await allImages(formState.skuImages);
      const modelImages = await allImages(formState.modelImages);
      const fabricImage = await firstImage(formState.fabricImage);
      const variationCount = clampInt(asNumber(formState.variationCount, 3), 1, 10);
      const customPrompt = asText(formState.customPrompt);
      const batchId = Date.now();

      if (skuImages.length === 0) {
        throw new Error("请至少上传一张 SKU 图片。");
      }
      if (modelImages.length === 0) {
        throw new Error("请至少上传一张模特图片。");
      }

      const basePrompt = customPrompt || prompts.basePrompt;
      const tasks: PreparedTask[] = [];

      modelImages.forEach((modelImage, modelIndex) => {
        skuImages.forEach((skuImage, skuIndex) => {
          for (let variant = 1; variant <= variationCount; variant += 1) {
            tasks.push({
              categoryId: "c3",
              originalPhotoId: `batch-generate-${batchId}-${modelIndex}-${skuIndex}-${variant}`,
              originalImageUrl: modelImage,
              imageUrl: modelImage,
              garmentImageBase64: skuImage,
              fabricImageBase64: fabricImage,
              instruction: joinPromptSegments([
                basePrompt,
                fabricImage ? prompts.fabricSuffix : "",
                interpolateTemplate(prompts.variantTemplate, {
                  variant,
                  variationCount
                })
              ]),
              aspectRatio: withAspectRatio(formState.aspectRatio),
              pointCost: 1
            });
          }
        });
      });

      return tasks;
    }

    case "c4": {
      const prompts = systemPrompts.c4;
      const flatlayImage = required(await firstImage(formState.flatlayImage), "平铺图");
      const referenceImage = await firstImage(formState.referenceImage);
      const customPrompt = asText(formState.customPrompt);

      return [
        {
          categoryId: "c4",
          originalPhotoId: `flatlay-to-3d-${Date.now()}`,
          originalImageUrl: flatlayImage,
          imageUrl: flatlayImage,
          garmentImageBase64: referenceImage,
          instruction:
            customPrompt ||
            (referenceImage ? prompts.withReferencePrompt : prompts.withoutReferencePrompt),
          aspectRatio: withAspectRatio(formState.aspectRatio),
          pointCost: 1
        }
      ];
    }

    case "c5": {
      const prompts = systemPrompts.c5;
      const effectImage = required(await firstImage(formState.effectImage), "效果图");
      const referenceModels = await allImages(formState.referenceModels);
      const customPrompt = asText(formState.customPrompt);
      const batchId = Date.now();

      if (referenceModels.length === 0) {
        throw new Error("请至少上传一张参考模特图。");
      }

      const instruction = joinPromptSegments([
        customPrompt || prompts.defaultPrompt,
        prompts.protectionSuffix
      ]);

      return referenceModels.map((modelImage, index) => ({
        categoryId: "c5" as const,
        originalPhotoId: `set-variation-${batchId}-${index}`,
        originalImageUrl: modelImage,
        imageUrl: modelImage,
        garmentImageBase64: effectImage,
        instruction,
        aspectRatio: withAspectRatio(formState.aspectRatio),
        pointCost: 1
      }));
    }

    case "c7": {
      const prompts = systemPrompts.c7;
      const subject = required(await firstImage(formState.subjectImage), "主体图");
      const background = required(await firstImage(formState.backgroundImage), "背景图");
      const similarity = clampInt(asNumber(formState.similarity, 50), 0, 100);
      const customPrompt = asText(formState.customPrompt);

      const similarityInstruction = interpolateTemplate(
        similarity >= 80 ? prompts.highSimilarityTemplate : prompts.normalSimilarityTemplate,
        { similarity }
      );

      return [
        {
          categoryId: "c7",
          originalPhotoId: `background-replace-${Date.now()}`,
          originalImageUrl: subject,
          imageUrl: subject,
          backgroundImageBase64: background,
          instruction: joinPromptSegments([
            customPrompt,
            prompts.basePrompt,
            similarityInstruction
          ]),
          aspectRatio: withAspectRatio(formState.aspectRatio),
          pointCost: 1
        }
      ];
    }

    case "c8": {
      const prompts = systemPrompts.c8;
      const productImage = required(await firstImage(formState.productImage), "商品图");
      const templates = asStringArray(formState.detailTemplates);
      const customTemplates = asMultilineTextArray(formState.customTemplates);
      const activeTemplates = [...templates, ...customTemplates];
      const batchId = Date.now();

      if (activeTemplates.length === 0) {
        throw new Error("请至少选择一个细节模板。");
      }

      return activeTemplates.map((template, index) => {
        const builtInPromptMap: Record<string, string> = {
          seam: prompts.seamTemplate,
          pocket: prompts.pocketTemplate,
          collar: prompts.collarTemplate,
          cuff: prompts.cuffTemplate
        };

        return {
          categoryId: "c8" as const,
          originalPhotoId: `detail-fanout-${template}-${batchId}-${index}`,
          originalImageUrl: productImage,
          imageUrl: productImage,
          instruction: builtInPromptMap[template] || template || prompts.fallbackTemplate,
          aspectRatio: withAspectRatio(formState.aspectRatio),
          pointCost: 1
        };
      });
    }

    case "c11": {
      const prompts = systemPrompts.c11;
      const garment = required(await firstImage(formState.garmentImage), "白底商品图");
      const referenceImage = await firstImage(formState.referenceImage);
      const tempModels = await allImages(formState.tempModelImages);
      const batchId = Date.now();

      const targets = [...(referenceImage ? [referenceImage] : []), ...tempModels];

      if (targets.length === 0) {
        throw new Error("请至少上传一张参考照片或临时模特图。");
      }

      return targets.map((targetImage, index) => ({
        categoryId: "c11" as const,
        originalPhotoId: `buyer-show-${batchId}-${index}`,
        originalImageUrl: targetImage,
        imageUrl: targetImage,
        garmentImageBase64: garment,
        instruction: prompts.basePrompt,
        aspectRatio: withAspectRatio(formState.aspectRatio),
        pointCost: 1
      }));
    }

    case "c12": {
      const prompts = systemPrompts.c12;
      const outfitImages = await allImages(formState.outfitImages);
      const batchId = Date.now();

      if (outfitImages.length === 0) {
        throw new Error("请至少上传一张穿搭图。");
      }

      return outfitImages.map((imageUrl, index) => ({
        categoryId: "c12" as const,
        originalPhotoId: `outfit-to-flatlay-${batchId}-${index}`,
        originalImageUrl: imageUrl,
        imageUrl,
        instruction: prompts.basePrompt,
        originalWidth: 800,
        originalHeight: 800,
        aspectRatio: withAspectRatio(formState.aspectRatio),
        pointCost: 1
      }));
    }

    case "c14": {
      const prompts = systemPrompts.c14;
      const modelImage = required(await firstImage(formState.modelImage), "模特图");
      const parts = asStringArray(formState.parts);
      const batchId = Date.now();
      const promptByPart = {
        top: prompts.topPrompt,
        bottom: prompts.bottomPrompt,
        shoes: prompts.shoesPrompt
      };

      if (parts.length === 0) {
        throw new Error("请至少选择一个提取部位。");
      }

      return parts.map((part, index) => ({
        categoryId: "c14" as const,
        originalPhotoId: `white-background-conversion-${part}-${batchId}-${index}`,
        originalImageUrl: modelImage,
        imageUrl: modelImage,
        instruction: promptByPart[part as keyof typeof promptByPart] ?? prompts.topPrompt,
        aspectRatio: withAspectRatio(formState.aspectRatio),
        pointCost: 1
      }));
    }

    case "c15": {
      const prompts = systemPrompts.c15;
      const modelImage = required(await firstImage(formState.modelImage), "模特图");
      const topImage = await firstImage(formState.topImage);
      const bottomImage = await firstImage(formState.bottomImage);
      const innerWearImage = await firstImage(formState.innerWearImage);
      const [shoesBagImage] = await allImages(formState.shoesBagImages);

      const selectedParts = [
        topImage ? "上装" : "",
        bottomImage ? "下装" : "",
        innerWearImage ? "内搭" : "",
        shoesBagImage ? "鞋子/包包饰品" : ""
      ].filter(Boolean);

      if (selectedParts.length === 0) {
        throw new Error("请至少上传一件服装单品。");
      }

      return [
        {
          categoryId: "c15",
          originalPhotoId: `full-outfit-${Date.now()}`,
          originalImageUrl: modelImage,
          imageUrl: modelImage,
          garmentImageBase64: topImage,
          fabricImageBase64: bottomImage,
          innerWearImageBase64: innerWearImage,
          backgroundImageBase64: shoesBagImage,
          instruction: joinPromptSegments([
            prompts.basePrompt,
            interpolateTemplate(prompts.selectedPartsTemplate, {
              selectedParts: selectedParts.join("、")
            }),
            innerWearImage ? prompts.innerWearSuffix : "",
            shoesBagImage ? prompts.accessoriesSuffix : "",
            prompts.qualitySuffix
          ]),
          aspectRatio: withAspectRatio(formState.aspectRatio),
          pointCost: 1
        }
      ];
    }

    case "c19": {
      const prompts = systemPrompts.c19;
      const target = required(await firstImage(formState.targetImage), "目标图");
      const prompt = asText(formState.prompt);

      if (!prompt) {
        throw new Error("请输入改款提示词。");
      }

      const reference = await firstImage(formState.referenceImage);
      const instruction = reference
        ? joinPromptSegments([prompt, prompts.referenceSuffix])
        : prompt;

      return [
        {
          categoryId: "c19",
          originalPhotoId: `ai-redesign-${Date.now()}`,
          originalImageUrl: target,
          imageUrl: target,
          garmentImageBase64: reference,
          instruction,
          aspectRatio: withAspectRatio(formState.aspectRatio),
          useRawPrompt: true,
          pointCost: 1
        }
      ];
    }

    case "c20": {
      const prompts = systemPrompts.c20;
      const sourceImage = required(await firstImage(formState.sourceImage), "原图");
      const resultCount = clampInt(asNumber(formState.resultCount, 3), 1, 10);
      const styleStrength = clampInt(asNumber(formState.styleStrength, 50), 0, 100);
      const colorStrength = clampInt(asNumber(formState.colorStrength, 100), 0, 100);
      const patternStrength = clampInt(asNumber(formState.patternStrength, 100), 0, 100);
      const batchId = Date.now();

      const styleLabel = buildBurstLabel(
        styleStrength,
        [
          [40, prompts.styleLabelHigh],
          [25, prompts.styleLabelMedium],
          [10, prompts.styleLabelLow]
        ],
        prompts.styleLabelKeep
      );

      const colorLabel = buildBurstLabel(
        colorStrength,
        [
          [80, prompts.colorLabelMax],
          [60, prompts.colorLabelHigh],
          [40, prompts.colorLabelMedium],
          [20, prompts.colorLabelLow]
        ],
        prompts.colorLabelKeep
      );

      const patternLabel = buildBurstLabel(
        patternStrength,
        [
          [80, prompts.patternLabelMax],
          [60, prompts.patternLabelHigh],
          [40, prompts.patternLabelMedium],
          [20, prompts.patternLabelLow]
        ],
        prompts.patternLabelKeep
      );

      const instruction = interpolateTemplate(prompts.instructionTemplate, {
        styleLabel,
        colorLabel,
        patternLabel
      });

      return Array.from({ length: resultCount }, (_, index) => ({
        categoryId: "c20" as const,
        originalPhotoId: `burst-variation-${batchId}-${index}`,
        originalImageUrl: sourceImage,
        imageUrl: sourceImage,
        instruction,
        aspectRatio: withAspectRatio(formState.aspectRatio),
        pointCost: 1
      }));
    }

    case "c21": {
      const prompts = systemPrompts.c21;
      const fabricImage = required(await firstImage(formState.fabricImage), "面料图");
      const topImages = await allImages(formState.topImages);
      const bottomImages = await allImages(formState.bottomImages);
      const batchId = Date.now();

      const garments = [
        ...topImages.map((imageUrl, index) => ({
          imageUrl,
          originalPhotoId: `fabric-change-top-${batchId}-${index}`
        })),
        ...bottomImages.map((imageUrl, index) => ({
          imageUrl,
          originalPhotoId: `fabric-change-bottom-${batchId}-${index}`
        }))
      ];

      if (garments.length === 0) {
        throw new Error("请至少上传一张上装或下装图片。");
      }

      return garments.map((garment) => ({
        categoryId: "c21" as const,
        originalPhotoId: garment.originalPhotoId,
        originalImageUrl: garment.imageUrl,
        imageUrl: garment.imageUrl,
        fabricImageBase64: fabricImage,
        instruction: prompts.basePrompt,
        aspectRatio: withAspectRatio(formState.aspectRatio),
        pointCost: 1
      }));
    }

    case "c22": {
      const prompts = systemPrompts.c22;
      const sourceImages = await allImages(formState.sourceImages);
      const batchId = Date.now();

      if (sourceImages.length === 0) {
        throw new Error("请至少上传一张原图。");
      }

      return sourceImages.map((imageUrl, index) => ({
        categoryId: "c22" as const,
        originalPhotoId: `upscale4k-upload-${batchId}-${index}`,
        originalImageUrl: imageUrl,
        imageUrl,
        instruction: prompts.basePrompt,
        aspectRatio: withAspectRatio(formState.aspectRatio),
        imageSize: "4K",
        skipCompress: true,
        pointCost: 1
      }));
    }

    case "c23": {
      const prompts = systemPrompts.c23;
      const personImage = required(await firstImage(formState.personImage), "人物图");
      const referencePoseImage = await firstImage(formState.referencePoseImage);
      const customPrompt = asText(formState.customPrompt);

      if (!customPrompt && !referencePoseImage) {
        throw new Error("未填写提示词时，请上传参考人物图。");
      }

      return [
        {
          categoryId: "c23",
          originalPhotoId: `pose-change-${Date.now()}`,
          originalImageUrl: personImage,
          imageUrl: personImage,
          garmentImageBase64: referencePoseImage,
          instruction: customPrompt || prompts.defaultPrompt,
          useRawPrompt: Boolean(customPrompt),
          pointCost: 1
        }
      ];
    }

    default: {
      if (module.scaffoldStatus !== "interactive") {
        throw new Error("当前模块尚未接入任务编排。");
      }

      return [await prepareSingleTask(module.id, formState, `${module.name}: ${module.goal}`)];
    }
  }
};
