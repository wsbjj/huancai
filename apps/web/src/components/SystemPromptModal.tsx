import {
  moduleDefinitions,
  modulePromptFieldSpecs,
  moduleSectionOrder,
  systemPromptModuleIds,
  type SystemPromptConfig,
  type SystemPromptModuleId
} from "@huancai/shared";

import { resolveModuleLabel, sectionLabelByIndex } from "../lib/module-labels";

type SystemPromptModalProps = {
  open: boolean;
  prompts: SystemPromptConfig;
  selectedModuleId: SystemPromptModuleId;
  busy?: boolean;
  loadError?: string;
  actionError?: string;
  actionMessage?: string;
  onClose: () => void;
  onSelectModule: (moduleId: SystemPromptModuleId) => void;
  onFieldChange: (
    moduleId: SystemPromptModuleId,
    fieldKey: string,
    value: string
  ) => void;
  onSave: () => void;
  onResetModule: () => void;
  onResetAll: () => void;
};

const groupedPromptModules = moduleSectionOrder
  .map((section, index) => ({
    section,
    sectionLabel: sectionLabelByIndex[index] ?? section,
    modules: moduleDefinitions.filter(
      (moduleDefinition) =>
        moduleDefinition.section === section &&
        systemPromptModuleIds.includes(moduleDefinition.id as SystemPromptModuleId)
    )
  }))
  .filter((group) => group.modules.length > 0);

export const SystemPromptModal = ({
  open,
  prompts,
  selectedModuleId,
  busy,
  loadError,
  actionError,
  actionMessage,
  onClose,
  onSelectModule,
  onFieldChange,
  onSave,
  onResetModule,
  onResetAll
}: SystemPromptModalProps) => {
  if (!open) {
    return null;
  }

  const fieldSpecs = modulePromptFieldSpecs[selectedModuleId];
  const currentModule = moduleDefinitions.find(
    (moduleDefinition) => moduleDefinition.id === selectedModuleId
  );
  const promptValues = prompts[selectedModuleId] as Record<string, string>;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <section
        className="prompt-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="prompt-modal-head">
          <div>
            <h2>系统提示词</h2>
            <p>统一管理各模块的默认提示词，保存后会立即影响新任务提交。</p>
          </div>
          <button className="toolbar-button" type="button" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="prompt-modal-body">
          <aside className="prompt-module-list">
            {groupedPromptModules.map((group) => (
              <section key={group.section} className="prompt-module-group">
                <h3>{group.sectionLabel}</h3>
                <div className="prompt-module-items">
                  {group.modules.map((moduleDefinition) => (
                    <button
                      key={moduleDefinition.id}
                      type="button"
                      className={`prompt-module-item ${
                        moduleDefinition.id === selectedModuleId ? "is-active" : ""
                      }`}
                      onClick={() => onSelectModule(moduleDefinition.id as SystemPromptModuleId)}
                    >
                      {resolveModuleLabel(moduleDefinition.id, moduleDefinition.name)}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </aside>

          <div className="prompt-editor">
            <div className="prompt-editor-head">
              <div>
                <h3>
                  {currentModule
                    ? resolveModuleLabel(currentModule.id, currentModule.name)
                    : selectedModuleId}
                </h3>
                <p>按字段编辑当前模块的默认系统提示词。</p>
              </div>
            </div>

            {loadError ? <div className="notice-banner prompt-banner">{loadError}</div> : null}
            {actionError ? <div className="error-banner prompt-banner">{actionError}</div> : null}
            {actionMessage ? <div className="success-banner prompt-banner">{actionMessage}</div> : null}

            <div className="prompt-fields">
              {fieldSpecs.map((field) => (
                <label key={field.key} className="prompt-field-card">
                  <div className="prompt-field-head">
                    <span className="field-label">{field.label}</span>
                    {field.allowEmpty ? <span className="meta-chip">可留空</span> : null}
                  </div>
                  {field.helperText ? <p className="field-help">{field.helperText}</p> : null}
                  {field.placeholders?.length ? (
                    <div className="prompt-placeholder-row">
                      {field.placeholders.map((placeholder) => (
                        <span key={placeholder} className="placeholder-chip">
                          {placeholder}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <textarea
                    className="textarea prompt-textarea"
                    value={promptValues[field.key] ?? ""}
                    onChange={(event) =>
                      onFieldChange(selectedModuleId, field.key, event.target.value)
                    }
                    disabled={busy}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <footer className="prompt-modal-footer">
          <button
            className="secondary-button"
            type="button"
            onClick={onResetModule}
            disabled={busy}
          >
            恢复当前模块默认
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onResetAll}
            disabled={busy}
          >
            恢复全部默认
          </button>
          <button className="primary-button" type="button" onClick={onSave} disabled={busy}>
            {busy ? "保存中..." : "保存系统提示词"}
          </button>
        </footer>
      </section>
    </div>
  );
};
