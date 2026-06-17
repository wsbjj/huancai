import { useEffect, useMemo, useState } from "react";

import { moduleDefinitions, type GeneratedResult } from "@huancai/shared";

import { deleteGeneratedResult, fetchGeneratedResults } from "../lib/api";
import { resolveModuleLabel } from "../lib/module-labels";

type HistoryWorkbenchProps = {
  onDataChanged?: () => void;
};

const downloadImage = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const HistoryWorkbench = ({ onDataChanged }: HistoryWorkbenchProps) => {
  const [items, setItems] = useState<GeneratedResult[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const results = await fetchGeneratedResults();
      setItems(results);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载历史记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const moduleName = resolveModuleLabel(item.categoryId);
      if (search.trim() && !moduleName.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      if (categoryId !== "all" && item.categoryId !== categoryId) {
        return false;
      }
      if (timeRange !== "all") {
        const createdAt = new Date(item.createdAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (timeRange === "today" && createdAt < startOfToday) {
          return false;
        }
        if (timeRange === "week") {
          const weekAgo = new Date(startOfToday);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (createdAt < weekAgo) {
            return false;
          }
        }
        if (timeRange === "month") {
          const monthAgo = new Date(startOfToday);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (createdAt < monthAgo) {
            return false;
          }
        }
      }
      return true;
    });
  }, [categoryId, items, search, timeRange]);

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredItems.map((item) => item.id));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGeneratedResult(id);
      await loadHistory();
      onDataChanged?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  };

  const handleBatchDownload = () => {
    filteredItems
      .filter((item) => selectedIds.includes(item.id) && item.generatedImageUrl)
      .forEach((item, index) => {
        downloadImage(item.generatedImageUrl!, `generated-${item.id}-${index}.png`);
      });
  };

  return (
    <div className="workspace-panel">
      <section className="card">
        <div className="card-header">
          <div>
            <h2>历史记录</h2>
            <p>查看所有分类生成结果，并支持筛选、删除与批量下载。</p>
          </div>
          <div className="header-actions">
            <span className="muted-text">共 {filteredItems.length} 条</span>
            <button className="secondary-button" onClick={selectAll} type="button">
              {selectedIds.length === filteredItems.length ? "取消全选" : "全选"}
            </button>
            <button
              className="primary-button"
              onClick={handleBatchDownload}
              type="button"
              disabled={selectedIds.length === 0}
            >
              批量下载
            </button>
          </div>
        </div>

        <div className="toolbar">
          <input
            className="text-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索分类名称"
          />
          <select
            className="text-input"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="all">全部分类</option>
            {moduleDefinitions
              .filter((moduleDefinition) => moduleDefinition.id !== "c9")
              .map((moduleDefinition) => (
                <option key={moduleDefinition.id} value={moduleDefinition.id}>
                  {resolveModuleLabel(moduleDefinition.id, moduleDefinition.name)}
                </option>
              ))}
          </select>
          <select
            className="text-input"
            value={timeRange}
            onChange={(event) => setTimeRange(event.target.value)}
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
          </select>
        </div>

        {loading ? <div className="empty-state">加载历史记录中...</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        {!loading && filteredItems.length === 0 ? (
          <div className="empty-state">当前没有符合条件的历史记录。</div>
        ) : null}

        <div className="result-grid">
          {filteredItems.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <article key={item.id} className={`result-card ${selected ? "is-selected" : ""}`}>
                <button
                  className="select-toggle"
                  type="button"
                  onClick={() => toggleSelect(item.id)}
                >
                  {selected ? "已选" : "选择"}
                </button>

                <div className="history-preview-grid">
                  {item.originalImageUrl ? (
                    <button
                      type="button"
                      className="history-preview"
                      onClick={() => setPreviewImageUrl(item.originalImageUrl!)}
                    >
                      <img src={item.originalImageUrl} alt="original" />
                      <span className="history-preview-tag">原图</span>
                    </button>
                  ) : null}

                  {item.generatedImageUrl ? (
                    <button
                      type="button"
                      className="history-preview"
                      onClick={() => setPreviewImageUrl(item.generatedImageUrl!)}
                    >
                      <img src={item.generatedImageUrl} alt={item.prompt} />
                      <span className="history-preview-tag">结果图</span>
                    </button>
                  ) : (
                    <div className="history-preview is-placeholder">
                      <div className="result-placeholder">{item.status}</div>
                    </div>
                  )}
                </div>

                <div className="result-meta">
                  <div className="result-row">
                    <span className="tag">{resolveModuleLabel(item.categoryId)}</span>
                    <span className="muted-text">
                      {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <p className="result-prompt">{item.prompt}</p>
                  <div className="result-actions">
                    {item.generatedImageUrl ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() =>
                          downloadImage(item.generatedImageUrl!, `generated-${item.id}.png`)
                        }
                      >
                        下载
                      </button>
                    ) : null}
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {previewImageUrl ? (
        <div
          className="image-viewer-overlay"
          onClick={() => setPreviewImageUrl(null)}
          role="presentation"
        >
          <div className="image-viewer-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              className="image-viewer-close"
              type="button"
              onClick={() => setPreviewImageUrl(null)}
            >
              关闭
            </button>
            <img src={previewImageUrl} alt="preview" />
          </div>
        </div>
      ) : null}
    </div>
  );
};
