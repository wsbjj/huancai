import type {
  FieldRole,
  ModuleDefinition,
  ModuleId,
  ScaffoldField,
  TextareaField
} from "@huancai/shared";

type FieldActionConfig = {
  label: string;
};

type ModuleUiPreset = {
  fieldOrder?: string[];
  hiddenFields?: string[];
  fieldLabels?: Record<string, string>;
  fieldHelpers?: Record<string, string>;
  fieldRoles?: Record<string, FieldRole>;
  fieldRequired?: Record<string, boolean>;
  fieldActions?: Record<string, FieldActionConfig>;
  submitText?: string;
  templateButtonLabel?: string;
  templateButtonAfterFieldId?: string;
};

const c4PromptField: TextareaField = {
  id: "customPrompt",
  kind: "textarea",
  role: "prompt",
  label: "提示词（可选）",
  placeholder: "不填写则使用默认提示词"
};

const presets: Partial<Record<ModuleId, ModuleUiPreset>> = {
  c3: {
    fieldOrder: [
      "skuImages",
      "modelImages",
      "fabricImage",
      "customPrompt",
      "aspectRatio",
      "variationCount"
    ],
    fieldLabels: {
      skuImages: "上传服装（支持批量）",
      modelImages: "上传临时模特（支持批量）",
      fabricImage: "上传面料图（可选）",
      customPrompt: "自定义提示词（可选）",
      aspectRatio: "输出尺寸（可选）",
      variationCount: "变体数量"
    },
    fieldRoles: {
      skuImages: "garment",
      modelImages: "primary",
      fabricImage: "fabric"
    },
    submitText: "开始批量生成"
  },
  c15: {
    fieldOrder: [
      "modelImage",
      "topImage",
      "bottomImage",
      "innerWearImage",
      "shoesBagImages",
      "aspectRatio"
    ],
    fieldLabels: {
      modelImage: "上传模特图（必填）",
      topImage: "上传上装（可选）",
      bottomImage: "上传下装（可选）",
      innerWearImage: "上传内搭（可选）",
      shoesBagImages: "上传鞋子/包包饰品（可选，支持多张）",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldRoles: {
      modelImage: "primary",
      topImage: "garment",
      bottomImage: "garment",
      innerWearImage: "garment",
      shoesBagImages: "background"
    },
    submitText: "立即生成"
  },
  c11: {
    fieldOrder: ["garmentImage", "tempModelImages", "referenceImage", "aspectRatio"],
    fieldLabels: {
      garmentImage: "上传服装图",
      tempModelImages: "上传临时模特（支持批量）",
      referenceImage: "或上传参考照片",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldRoles: {
      garmentImage: "garment",
      tempModelImages: "primary",
      referenceImage: "primary"
    },
    submitText: "立即生成"
  },
  c4: {
    fieldOrder: ["flatlayImage", "referenceImage", "customPrompt", "aspectRatio"],
    fieldLabels: {
      flatlayImage: "上传服装平铺图",
      referenceImage: "上传参考挂拍图（可选）",
      customPrompt: "提示词（可选）",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldRoles: {
      flatlayImage: "primary",
      referenceImage: "garment"
    },
    fieldHelpers: {
      customPrompt: "不填写则使用默认提示词"
    },
    submitText: "立即生成"
  },
  c5: {
    fieldOrder: ["effectImage", "referenceModels", "customPrompt", "aspectRatio"],
    fieldLabels: {
      effectImage: "上传效果图",
      referenceModels: "上传临时模特（支持批量）",
      customPrompt: "自定义提示词（可选）",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldRoles: {
      effectImage: "garment",
      referenceModels: "primary"
    },
    submitText: "立即生成"
  },
  c7: {
    fieldOrder: ["subjectImage", "backgroundImage", "similarity", "customPrompt", "aspectRatio"],
    fieldLabels: {
      subjectImage: "上传主体图（必填）",
      backgroundImage: "上传背景图（必填）",
      similarity: "背景相似度",
      customPrompt: "提示词输入（可选）",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldRoles: {
      backgroundImage: "background",
      subjectImage: "primary"
    },
    fieldHelpers: {
      customPrompt: "建议描述目标背景场景，如海边、街景、室内棚拍。"
    },
    submitText: "立即生成"
  },
  c8: {
    fieldOrder: ["productImage", "customTemplates", "aspectRatio"],
    hiddenFields: ["detailTemplates"],
    fieldLabels: {
      productImage: "上传商品白底图",
      customTemplates: "自定义细节模板（可选）",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldHelpers: {
      customTemplates: "每行一条模板描述；会和已选内置模板一起生成。"
    },
    fieldRoles: {
      productImage: "primary"
    },
    submitText: "立即生成",
    templateButtonLabel: "选择细节模板",
    templateButtonAfterFieldId: "productImage"
  },
  c12: {
    fieldOrder: ["outfitImages", "aspectRatio"],
    fieldLabels: {
      outfitImages: "上传穿搭图（支持批量）",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldRoles: {
      outfitImages: "primary"
    },
    submitText: "立即生成"
  },
  c14: {
    fieldOrder: ["modelImage", "parts", "aspectRatio"],
    fieldLabels: {
      modelImage: "上传模特图",
      parts: "选择需要提取的部位",
      aspectRatio: "选择输出尺寸（可选）"
    },
    fieldHelpers: {
      parts: "请至少选择一个部位。"
    },
    fieldRoles: {
      modelImage: "primary",
      parts: "parts"
    },
    submitText: "立即生成"
  },
  c19: {
    fieldOrder: ["targetImage", "prompt", "aspectRatio", "referenceImage"],
    fieldLabels: {
      targetImage: "上传需要改款的图片（必填）",
      prompt: "提示词（必填）",
      aspectRatio: "输出尺寸",
      referenceImage: "上传参考图（可选）"
    },
    fieldHelpers: {
      prompt: "描述希望修改的细节，如廓形、领型、材质、颜色。",
      aspectRatio: "不选则使用默认尺寸比例。"
    },
    fieldRoles: {
      targetImage: "primary",
      referenceImage: "garment"
    },
    submitText: "立即生成"
  },
  c20: {
    fieldOrder: [
      "sourceImage",
      "styleStrength",
      "colorStrength",
      "patternStrength",
      "resultCount",
      "aspectRatio"
    ],
    fieldLabels: {
      sourceImage: "上传原图",
      styleStrength: "款式变化",
      colorStrength: "颜色变化",
      patternStrength: "图案变化",
      resultCount: "生成数量",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldHelpers: {
      sourceImage: "支持 JPG / PNG",
      aspectRatio: "不选择则按默认输出。"
    },
    fieldRoles: {
      sourceImage: "primary"
    },
    submitText: "开始裂变"
  },
  c21: {
    fieldOrder: ["topImages", "bottomImages", "fabricImage", "customPrompt", "aspectRatio"],
    fieldLabels: {
      topImages: "上传上装（可选，支持多选）",
      bottomImages: "上传下装（可选，支持多选）",
      fabricImage: "上传面料（必填）",
      customPrompt: "自定义提示词（可选）",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldHelpers: {
      customPrompt: "当前版本保留输入框，默认仍使用固定换料提示词。",
      aspectRatio: "不选择则按默认输出。"
    },
    fieldRoles: {
      topImages: "primary",
      bottomImages: "primary",
      fabricImage: "fabric"
    },
    submitText: "开始生成"
  },
  c22: {
    fieldOrder: ["sourceImages", "aspectRatio"],
    fieldLabels: {
      sourceImages: "上传图片",
      aspectRatio: "输出尺寸（可选）"
    },
    fieldHelpers: {
      sourceImages: "支持多选。",
      aspectRatio: "不选择则按默认输出。"
    },
    fieldRoles: {
      sourceImages: "primary"
    },
    submitText: "生成4K"
  },
  c23: {
    fieldOrder: ["personImage", "customPrompt", "referencePoseImage"],
    fieldLabels: {
      personImage: "上传人物图（必填）",
      customPrompt: "提示词（可选）",
      referencePoseImage: "上传参考人物图（可选）"
    },
    fieldHelpers: {
      customPrompt:
        "输入提示词后只需上传人物图即可；若同时上传参考图，则会作为辅助参考。不输入提示词时建议上传参考图。"
    },
    fieldRoles: {
      personImage: "primary",
      referencePoseImage: "garment"
    },
    submitText: "立即生成"
  }
};

const applyFieldOverrides = (
  field: ScaffoldField,
  preset: ModuleUiPreset
): ScaffoldField => {
  const label = preset.fieldLabels?.[field.id];
  const helperText = preset.fieldHelpers?.[field.id];
  const role = preset.fieldRoles?.[field.id] ?? field.role;
  const required = preset.fieldRequired?.[field.id] ?? field.required;

  if (field.kind === "textarea") {
    return {
      ...field,
      role,
      required,
      label: label ?? field.label,
      helperText: helperText ?? field.helperText
    };
  }

  return {
    ...field,
    role,
    required,
    label: label ?? field.label,
    helperText: helperText ?? field.helperText
  };
};

export const resolveModulePreset = (moduleId: ModuleId): ModuleUiPreset | undefined =>
  presets[moduleId];

export const resolveModuleFieldsForUI = (
  module: ModuleDefinition,
  preset: ModuleUiPreset | undefined
): ScaffoldField[] => {
  const fields: ScaffoldField[] = [...module.fields];

  if (module.id === "c4" && !fields.some((field) => field.id === "customPrompt")) {
    fields.push(c4PromptField);
  }

  const hiddenFieldSet = new Set(preset?.hiddenFields ?? []);
  const visibleFields = fields.filter((field) => !hiddenFieldSet.has(field.id));
  const withOverrides = visibleFields.map((field) =>
    preset ? applyFieldOverrides(field, preset) : field
  );

  if (!preset?.fieldOrder || preset.fieldOrder.length === 0) {
    return withOverrides;
  }

  const orderMap = new Map<string, number>();
  preset.fieldOrder.forEach((fieldId, index) => orderMap.set(fieldId, index));

  return withOverrides.sort((left, right) => {
    const leftIndex = orderMap.get(left.id);
    const rightIndex = orderMap.get(right.id);

    if (leftIndex === undefined && rightIndex === undefined) {
      return 0;
    }
    if (leftIndex === undefined) {
      return 1;
    }
    if (rightIndex === undefined) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
};
