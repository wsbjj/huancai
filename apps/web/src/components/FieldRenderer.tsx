import type { ChangeEvent } from "react";

import type {
  CheckGroupField,
  CountField,
  ImageField,
  RatioField,
  ScaffoldField,
  SliderField,
  TextareaField
} from "@huancai/shared";

type FieldRendererProps = {
  field: ScaffoldField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

const renderImageSummary = (value: unknown): string => {
  if (value instanceof File) {
    return value.name;
  }
  if (Array.isArray(value)) {
    const files = value.filter((entry): entry is File => entry instanceof File);
    return files.length > 0 ? `已选择 ${files.length} 个文件` : "支持拖拽或点击上传";
  }
  return "支持拖拽或点击上传";
};

const ImageInput = ({
  field,
  value,
  onChange,
  disabled
}: FieldRendererProps & { field: ImageField }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    onChange(field.kind === "image-multi" ? files : files[0] ?? null);
  };

  return (
    <label className={`upload-box role-${field.role ?? "default"}`}>
      <input
        className="upload-input"
        type="file"
        accept={field.accept ?? "image/*"}
        multiple={field.kind === "image-multi"}
        onChange={handleChange}
        disabled={disabled}
      />
      <span className="upload-icon">↑</span>
      <span className="upload-title">
        {field.kind === "image-multi" ? "点击上传多图" : "点击上传"}
      </span>
      <small className="upload-summary">{renderImageSummary(value)}</small>
    </label>
  );
};

const TextareaInput = ({
  field,
  value,
  onChange,
  disabled
}: FieldRendererProps & { field: TextareaField }) => {
  const textValue = typeof value === "string" ? value : field.defaultValue ?? "";

  return (
    <div className="textarea-wrap">
      <textarea
        className="textarea"
        value={textValue}
        maxLength={1200}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <small className="textarea-counter">{textValue.length}/1200</small>
    </div>
  );
};

const sliderHintMap: Record<string, { left: string; right: string }> = {
  styleStrength: { left: "保持原款 (0)", right: "改变款式 (100)" },
  colorStrength: { left: "保持原色 (0)", right: "改变颜色 (100)" },
  patternStrength: { left: "保持原图 (0)", right: "改变图案 (100)" }
};

const SliderInput = ({
  field,
  value,
  onChange,
  disabled
}: FieldRendererProps & { field: SliderField }) => {
  const numericValue = typeof value === "number" ? value : field.defaultValue;
  const hint = sliderHintMap[field.id];
  const sliderValueLabel =
    field.min === 0 && field.max === 100 ? `${numericValue}/100` : `${numericValue}`;

  return (
    <div className="slider-group">
      <div className="slider-row">
        <input
          className="slider"
          type="range"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={numericValue}
          onChange={(event) => onChange(Number(event.target.value))}
          disabled={disabled}
        />
        <span className="slider-value">{sliderValueLabel}</span>
      </div>
      {hint ? (
        <div className="slider-hint-row">
          <span>{hint.left}</span>
          <span>{hint.right}</span>
        </div>
      ) : null}
    </div>
  );
};

const CountInput = ({
  field,
  value,
  onChange,
  disabled
}: FieldRendererProps & { field: CountField }) => {
  const currentValue = typeof value === "number" ? value : field.defaultValue;
  const quickOptions =
    field.id === "variationCount"
      ? [1, 3, 5, 10]
      : field.id === "resultCount"
        ? Array.from({ length: field.max - field.min + 1 }, (_, index) => field.min + index)
        : Array.from(new Set([field.min, field.defaultValue, field.max]));
  const availableOptions = quickOptions.filter(
    (option) => option >= field.min && option <= field.max
  );
  const showNumberInput = field.id !== "resultCount";

  return (
    <div className="count-input-wrap">
      <div className={`count-option-group ${field.id === "resultCount" ? "is-grid" : ""}`}>
        {availableOptions.map((option) => (
          <button
            key={option}
            type="button"
            className={`count-option-button ${option === currentValue ? "is-active" : ""}`}
            onClick={() => onChange(option)}
            disabled={disabled}
          >
            {option}
          </button>
        ))}
      </div>
      {showNumberInput ? (
        <input
          className="text-input"
          type="number"
          min={field.min}
          max={field.max}
          value={currentValue}
          onChange={(event) => onChange(Number(event.target.value))}
          disabled={disabled}
        />
      ) : (
        <small className="count-hint">
          将生成 {currentValue} 张图片，预计消耗 {currentValue} 个点数
        </small>
      )}
    </div>
  );
};

const RatioInput = ({
  field,
  value,
  onChange,
  disabled
}: FieldRendererProps & { field: RatioField }) => (
  <div className="ratio-group">
    {field.options.map((option) => {
      const active = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          className={`ratio-button ${active ? "is-active" : ""}`}
          onClick={() => onChange(active ? "" : option.value)}
          disabled={disabled}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const CheckGroupInput = ({
  field,
  value,
  onChange,
  disabled
}: FieldRendererProps & { field: CheckGroupField }) => {
  const current = Array.isArray(value) ? value : field.defaultValue ?? [];

  const toggle = (optionValue: string) => {
    const next = new Set(current as string[]);
    if (next.has(optionValue)) {
      next.delete(optionValue);
    } else {
      next.add(optionValue);
    }
    onChange(Array.from(next));
  };

  return (
    <div className="check-group">
      {field.options.map((option) => {
        const active = (current as string[]).includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            className={`check-chip ${active ? "is-active" : ""}`}
            onClick={() => toggle(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export const FieldRenderer = ({
  field,
  value,
  onChange,
  disabled
}: FieldRendererProps) => (
  <div className={`field field-${field.kind} role-${field.role ?? "default"}`}>
    <div className="field-label-row">
      <label className="field-label">{field.label}</label>
      {field.required ? <span className="field-required">必填</span> : null}
    </div>
    {field.helperText ? <p className="field-help">{field.helperText}</p> : null}

    {field.kind === "image" || field.kind === "image-multi" ? (
      <ImageInput field={field} value={value} onChange={onChange} disabled={disabled} />
    ) : null}
    {field.kind === "textarea" ? (
      <TextareaInput field={field} value={value} onChange={onChange} disabled={disabled} />
    ) : null}
    {field.kind === "slider" ? (
      <SliderInput field={field} value={value} onChange={onChange} disabled={disabled} />
    ) : null}
    {field.kind === "count" ? (
      <CountInput field={field} value={value} onChange={onChange} disabled={disabled} />
    ) : null}
    {field.kind === "ratio" ? (
      <RatioInput field={field} value={value} onChange={onChange} disabled={disabled} />
    ) : null}
    {field.kind === "check-group" ? (
      <CheckGroupInput field={field} value={value} onChange={onChange} disabled={disabled} />
    ) : null}
  </div>
);
