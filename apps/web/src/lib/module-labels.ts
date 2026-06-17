import type { ModuleId } from "@huancai/shared";

export const moduleLabelMap: Record<ModuleId, string> = {
  c3: "批量生图",
  c4: "平铺转3D",
  c5: "裂变套图",
  c7: "换背景",
  c8: "生成细节",
  c9: "历史记录",
  c11: "买家秀制作",
  c12: "穿搭转平铺",
  c14: "模特图转白底",
  c15: "整套穿搭",
  c19: "AI改款",
  c20: "爆款裂变",
  c21: "服装换料",
  c22: "高清放大",
  c23: "复刻姿势"
};

export const sectionLabelByIndex = ["商品上身", "图片创作", "其他"] as const;

export const resolveModuleLabel = (moduleId: ModuleId, fallback?: string): string =>
  moduleLabelMap[moduleId] ?? fallback ?? moduleId;
