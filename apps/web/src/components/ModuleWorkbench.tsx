import { useEffect, useMemo, useState } from "react";

import type {
  CheckGroupField,
  GenerateImageRequest,
  GeneratedResult,
  ModuleDefinition,
  ScaffoldField,
  SystemPromptConfig
} from "@huancai/shared";

import {
  createGeneratedResult,
  deleteGeneratedResult,
  fetchGeneratedResults,
  generateImage,
  uploadDataUrl
} from "../lib/api";
import { resolveModuleLabel } from "../lib/module-labels";
import { resolveModuleFieldsForUI, resolveModulePreset } from "../lib/module-ui-presets";
import { buildTasksForModule } from "../lib/scaffold";
import { FieldRenderer } from "./FieldRenderer";

type ModuleWorkbenchProps = {
  module: ModuleDefinition;
  systemPrompts: SystemPromptConfig;
  onPointsChanged: (points: number) => void;
  onDataChanged?: () => void;
};

const createInitialFormState = (fields: ScaffoldField[]): Record<string, unknown> =>
  Object.fromEntries(
    fields.map((field) => {
      if (field.kind === "slider" || field.kind === "count") {
        return [field.id, field.defaultValue];
      }
      if (field.kind === "check-group") {
        return [field.id, field.defaultValue ?? []];
      }
      if (field.kind === "ratio" || field.kind === "textarea") {
        return [field.id, field.defaultValue ?? ""];
      }
      if (field.kind === "image-multi") {
        return [field.id, []];
      }
      return [field.id, null];
    })
  );

const downloadImage = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const uploadIfNeeded = async (
  value: string | undefined,
  cache: Map<string, string>,
  filename: string
): Promise<string | undefined> => {
  if (!value) {
    return undefined;
  }

  if (!value.startsWith("data:")) {
    return value;
  }

  const cached = cache.get(value);
  if (cached) {
    return cached;
  }

  const uploaded = await uploadDataUrl(value, filename);
  cache.set(value, uploaded);
  return uploaded;
};

const resolveModeLabel = (uiMode: ModuleDefinition["uiMode"]): string => {
  if (uiMode === "single") {
    return "单图";
  }
  if (uiMode === "batch") {
    return "批量";
  }
  if (uiMode === "history") {
    return "历史";
  }
  return uiMode;
};

const detailTemplateCategoryLabels = [
  "长裤",
  "衬衫",
  "外套",
  "卫衣",
  "T恤",
  "短裤",
  "裙子",
  "连衣裙",
  "吊带裙"
];

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const asFileList = (value: unknown): File[] => {
  if (value instanceof File) {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is File => entry instanceof File);
  }
  return [];
};

const asNumeric = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const asTrimmedText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const countNonEmptyLines = (value: unknown): number => {
  const text = asTrimmedText(value);
  if (!text) {
    return 0;
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
};

export const ModuleWorkbench = ({
  module,
  systemPrompts,
  onPointsChanged,
  onDataChanged
}: ModuleWorkbenchProps) => {
  const modulePreset = useMemo(() => resolveModulePreset(module.id), [module.id]);
  const displayFields = useMemo(
    () => resolveModuleFieldsForUI(module, modulePreset),
    [module, modulePreset]
  );

  const [formState, setFormState] = useState<Record<string, unknown>>(
    createInitialFormState(displayFields)
  );
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);

  const detailTemplateField = useMemo(() => {
    if (module.id !== "c8") {
      return undefined;
    }
    return module.fields.find(
      (field): field is CheckGroupField =>
        field.id === "detailTemplates" && field.kind === "check-group"
    );
  }, [module]);

  const selectedDetailTemplates = useMemo(
    () => asStringList(formState.detailTemplates),
    [formState.detailTemplates]
  );

  const loadResults = async () => {
    try {
      setLoadingResults(true);
      setError("");
      const nextResults = await fetchGeneratedResults(module.id);
      setResults(nextResults);
      setSelectedResultId((current) => {
        if (current && nextResults.some((result) => result.id === current)) {
          return current;
        }
        return nextResults[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载结果失败");
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    const nextFormState = createInitialFormState(displayFields);
    if (module.id === "c8") {
      const templateDefaults = module.fields.find(
        (field): field is CheckGroupField =>
          field.id === "detailTemplates" && field.kind === "check-group"
      )?.defaultValue;
      nextFormState.detailTemplates = templateDefaults ?? [];
    }

    setFormState(nextFormState);
    setMessage("");
    setError("");
    setTemplatePanelOpen(false);
    setSelectedResultId(null);
    void loadResults();
  }, [module, displayFields]);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormState((current) => ({
      ...current,
      [fieldId]: value
    }));
  };

  const toggleDetailTemplate = (optionValue: string) => {
    setFormState((current) => {
      const next = new Set(asStringList(current.detailTemplates));
      if (next.has(optionValue)) {
        next.delete(optionValue);
      } else {
        next.add(optionValue);
      }
      return {
        ...current,
        detailTemplates: Array.from(next)
      };
    });
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const tasks = await buildTasksForModule(module, formState, systemPrompts);
      if (tasks.length === 0) {
        throw new Error("当前没有可提交的任务。");
      }

      const uploadCache = new Map<string, string>();

      for (const task of tasks) {
        const normalizedTask = {
          ...task,
          imageUrl: await uploadIfNeeded(
            task.imageUrl,
            uploadCache,
            `${module.id}-${task.originalPhotoId}-main.png`
          ),
          originalImageUrl: await uploadIfNeeded(
            task.originalImageUrl,
            uploadCache,
            `${module.id}-${task.originalPhotoId}-original.png`
          ),
          garmentImageBase64: await uploadIfNeeded(
            task.garmentImageBase64,
            uploadCache,
            `${module.id}-${task.originalPhotoId}-garment.png`
          ),
          fabricImageBase64: await uploadIfNeeded(
            task.fabricImageBase64,
            uploadCache,
            `${module.id}-${task.originalPhotoId}-fabric.png`
          ),
          backgroundImageBase64: await uploadIfNeeded(
            task.backgroundImageBase64,
            uploadCache,
            `${module.id}-${task.originalPhotoId}-background.png`
          ),
          innerWearImageBase64: await uploadIfNeeded(
            task.innerWearImageBase64,
            uploadCache,
            `${module.id}-${task.originalPhotoId}-innerwear.png`
          )
        };

        const imageUrl = normalizedTask.imageUrl;
        if (!imageUrl) {
          throw new Error("任务主图上传失败。");
        }

        const originalImageUrl = normalizedTask.originalImageUrl ?? imageUrl;

        const created = await createGeneratedResult({
          originalPhotoId: normalizedTask.originalPhotoId,
          originalImageUrl,
          prompt: normalizedTask.instruction,
          categoryId: normalizedTask.categoryId,
          modelId: "",
          styleId: "",
          status: "processing",
          userId: "demo-user",
          pointCost: normalizedTask.pointCost
        });

        onPointsChanged(created.remainingPoints);

        const generatePayload: GenerateImageRequest = {
          resultId: created.result.id,
          categoryId: normalizedTask.categoryId,
          originalPhotoId: normalizedTask.originalPhotoId,
          originalImageUrl,
          imageUrl,
          instruction: normalizedTask.instruction,
          garmentImageBase64: normalizedTask.garmentImageBase64,
          fabricImageBase64: normalizedTask.fabricImageBase64,
          innerWearImageBase64: normalizedTask.innerWearImageBase64,
          backgroundImageBase64: normalizedTask.backgroundImageBase64,
          aspectRatio: normalizedTask.aspectRatio,
          imageSize: normalizedTask.imageSize,
          originalWidth: normalizedTask.originalWidth,
          originalHeight: normalizedTask.originalHeight,
          useRawPrompt: normalizedTask.useRawPrompt,
          skipCompress: normalizedTask.skipCompress
        };

        await generateImage(generatePayload);
      }

      setMessage(`已完成 ${resolveModuleLabel(module.id, module.name)} 的 ${tasks.length} 个任务。`);
      await loadResults();
      onDataChanged?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (resultId: string) => {
    try {
      await deleteGeneratedResult(resultId);
      await loadResults();
      onDataChanged?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  };

  const activeResult = useMemo(() => {
    if (results.length === 0) {
      return undefined;
    }
    if (!selectedResultId) {
      return results[0];
    }
    return results.find((result) => result.id === selectedResultId) ?? results[0];
  }, [results, selectedResultId]);

  const activePreviewUrl = activeResult?.generatedImageUrl ?? activeResult?.originalImageUrl;
  const submitText = modulePreset?.submitText ?? "立即生成";
  const templateButtonLabel = modulePreset?.templateButtonLabel;
  const templateButtonAfterFieldId = modulePreset?.templateButtonAfterFieldId;
  const shouldShowDetailTemplatePanel =
    module.id === "c8" && templatePanelOpen && Boolean(detailTemplateField);
  const emptyPreviewText =
    module.id === "c8"
      ? "点击左侧“选择细节模板”按钮开始选择"
      : "提交任务后会在这里展示结果。";

  const dynamicTaskCount = useMemo(() => {
    if (module.id === "c20") {
      const count = asNumeric(formState.resultCount, 3);
      return Math.min(Math.max(Math.round(count), 1), 10);
    }
    if (module.id === "c21") {
      return asFileList(formState.topImages).length + asFileList(formState.bottomImages).length;
    }
    if (module.id === "c22") {
      return asFileList(formState.sourceImages).length;
    }
    return undefined;
  }, [formState.bottomImages, formState.resultCount, formState.sourceImages, formState.topImages, module.id]);

  const resolvedSubmitText =
    dynamicTaskCount === undefined ? submitText : `${submitText}（${dynamicTaskCount}张）`;

  const submitReady = useMemo(() => {
    if (module.id === "c19") {
      return (
        asFileList(formState.targetImage).length > 0 &&
        asTrimmedText(formState.prompt).length > 0
      );
    }
    if (module.id === "c20") {
      return asFileList(formState.sourceImage).length > 0;
    }
    if (module.id === "c8") {
      const hasImage = asFileList(formState.productImage).length > 0;
      const hasCustomTemplates = countNonEmptyLines(formState.customTemplates) > 0;
      return hasImage && (selectedDetailTemplates.length > 0 || hasCustomTemplates);
    }
    if (module.id === "c11") {
      const hasGarment = asFileList(formState.garmentImage).length > 0;
      const hasReference = asFileList(formState.referenceImage).length > 0;
      const hasTempModels = asFileList(formState.tempModelImages).length > 0;
      return hasGarment && (hasReference || hasTempModels);
    }
    if (module.id === "c21") {
      return asFileList(formState.fabricImage).length > 0 && (dynamicTaskCount ?? 0) > 0;
    }
    if (module.id === "c22") {
      return (dynamicTaskCount ?? 0) > 0;
    }
    if (module.id === "c23") {
      const hasPerson = asFileList(formState.personImage).length > 0;
      const hasPrompt = asTrimmedText(formState.customPrompt).length > 0;
      const hasReference = asFileList(formState.referencePoseImage).length > 0;
      return hasPerson && (hasPrompt || hasReference);
    }
    return true;
  }, [
    dynamicTaskCount,
    formState.customPrompt,
    formState.customTemplates,
    formState.fabricImage,
    formState.garmentImage,
    formState.personImage,
    formState.productImage,
    formState.prompt,
    formState.referenceImage,
    formState.referencePoseImage,
    formState.sourceImage,
    formState.targetImage,
    formState.tempModelImages,
    module.id,
    selectedDetailTemplates.length
  ]);

  const renderTemplateButton = (className?: string) => {
    if (!templateButtonLabel) {
      return null;
    }

    const buttonLabel =
      module.id === "c8"
        ? `${templateButtonLabel}${selectedDetailTemplates.length > 0 ? `（已选${selectedDetailTemplates.length}）` : ""}`
        : templateButtonLabel;

    const activeClass = module.id === "c8" && templatePanelOpen ? " is-active" : "";
    return (
      <button
        className={`${className ?? "template-library-button"}${activeClass}`}
        type="button"
        onClick={() => setTemplatePanelOpen((current) => !current)}
      >
        {buttonLabel}
      </button>
    );
  };

  return (
    <div className={`studio-layout ${modulePreset ? "is-preset-module" : ""}`}>
      <aside className="studio-controls">
        <div className="studio-control-head">
          <h3>{resolveModuleLabel(module.id, module.name)}</h3>
          {!modulePreset ? (
            <div className="module-meta-row">
              <span className="meta-chip">{module.id}</span>
              <span className="meta-chip">{resolveModeLabel(module.uiMode)}</span>
              <span className={`status-pill status-${module.scaffoldStatus}`}>
                {module.scaffoldStatus}
              </span>
            </div>
          ) : null}
        </div>

        {displayFields.length > 0 ? (
          <div className="control-form">
            {displayFields.map((field) => (
              <div key={field.id} className="field-wrap">
                <FieldRenderer
                  field={field}
                  value={formState[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                  disabled={busy}
                />
                {modulePreset?.fieldActions?.[field.id] ? (
                  <button className="field-extra-action" type="button">
                    {modulePreset.fieldActions[field.id].label}
                  </button>
                ) : null}
                {templateButtonAfterFieldId === field.id
                  ? renderTemplateButton("template-library-button inline")
                  : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">当前模块不需要输入表单。</div>
        )}

        {!templateButtonAfterFieldId ? renderTemplateButton() : null}

        {module.scaffoldStatus === "placeholder" ? (
          <div className="notice-banner">当前模块仍是占位状态，尚未接入完整任务编排。</div>
        ) : null}

        {message ? <div className="success-banner">{message}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}

        {module.scaffoldStatus === "interactive" ? (
          <button
            className="primary-button wide"
            onClick={() => void handleSubmit()}
            disabled={busy || !submitReady}
            type="button"
          >
            {busy ? "处理中..." : resolvedSubmitText}
          </button>
        ) : null}
      </aside>

      <section className="studio-canvas">
        <div className="studio-canvas-head">
          <div>
            <h3>生成预览</h3>
            <p>按右侧缩略图切换查看结果，支持下载与删除。</p>
          </div>
          <span className="result-count">生成结果 ({results.length})</span>
        </div>

        <div className={`canvas-stage ${shouldShowDetailTemplatePanel ? "is-template-panel" : ""}`}>
          {shouldShowDetailTemplatePanel && detailTemplateField ? (
            <div className="detail-template-panel">
              <div className="detail-template-header">
                <h4>选择细节模板</h4>
                <button
                  className="detail-template-close"
                  type="button"
                  onClick={() => setTemplatePanelOpen(false)}
                >
                  关闭
                </button>
              </div>
              <div className="detail-template-grid">
                {detailTemplateField.options.map((option) => {
                  const active = selectedDetailTemplates.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`detail-template-item ${active ? "is-active" : ""}`}
                      onClick={() => toggleDetailTemplate(option.value)}
                    >
                      <span className="detail-template-thumb">⌗</span>
                      <span className="detail-template-name">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="detail-template-category-list">
                {detailTemplateCategoryLabels.map((category) => (
                  <button key={category} type="button" className="detail-template-category">
                    {category}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!shouldShowDetailTemplatePanel && loadingResults ? (
            <div className="result-placeholder">加载中...</div>
          ) : null}
          {!shouldShowDetailTemplatePanel && !loadingResults && !activePreviewUrl ? (
            <div className="result-placeholder">{emptyPreviewText}</div>
          ) : null}
          {!shouldShowDetailTemplatePanel && !loadingResults && activePreviewUrl ? (
            <img src={activePreviewUrl} alt={activeResult?.prompt ?? "result"} />
          ) : null}
        </div>

        {!shouldShowDetailTemplatePanel && activeResult ? (
          <div className="canvas-footer">
            <div className="canvas-meta">
              <span className={`tag status-${activeResult.status}`}>{activeResult.status}</span>
              <span className="muted-text">
                {new Date(activeResult.createdAt).toLocaleString("zh-CN")}
              </span>
            </div>
            <p className="result-prompt">{activeResult.prompt}</p>
            <div className="result-actions">
              {activeResult.generatedImageUrl ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    downloadImage(activeResult.generatedImageUrl!, `${activeResult.id}.png`)
                  }
                >
                  下载当前
                </button>
              ) : null}
              <button
                className="danger-button"
                type="button"
                onClick={() => void handleDelete(activeResult.id)}
              >
                删除当前
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="studio-results">
        <h4>结果列表</h4>
        {loadingResults ? <div className="empty-state compact">加载结果中...</div> : null}
        {!loadingResults && results.length === 0 ? (
          <div className="empty-state compact">暂无结果</div>
        ) : null}
        <div className="thumb-list">
          {results.map((result, index) => (
            <button
              key={result.id}
              className={`thumb-item ${result.id === activeResult?.id ? "is-active" : ""}`}
              type="button"
              onClick={() => setSelectedResultId(result.id)}
            >
              <span className="thumb-index">{index + 1}</span>
              <div className="thumb-image">
                {result.generatedImageUrl ? (
                  <img src={result.generatedImageUrl} alt={result.prompt} />
                ) : (
                  <div className="result-placeholder">{result.status}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
};
