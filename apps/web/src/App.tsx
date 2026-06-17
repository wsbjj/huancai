import { useEffect, useMemo, useState } from "react";

import {
  cloneSystemPromptConfig,
  createDefaultSystemPromptConfig,
  moduleDefinitions,
  moduleSectionOrder,
  systemPromptModuleIds,
  type ModuleDefinition,
  type SystemPromptConfig,
  type SystemPromptModuleId
} from "@huancai/shared";

import { HistoryWorkbench } from "./components/HistoryWorkbench";
import { LoginPage } from "./components/LoginPage";
import { ModuleWorkbench } from "./components/ModuleWorkbench";
import { SystemPromptModal } from "./components/SystemPromptModal";
import {
  clearOperatorSession,
  createOperatorSession,
  readOperatorSession,
  type OperatorSession
} from "./lib/auth";
import {
  fetchHealth,
  fetchPoints,
  fetchSystemPrompts,
  resetSystemPrompts,
  saveSystemPrompts
} from "./lib/api";
import { resolveModuleLabel, sectionLabelByIndex } from "./lib/module-labels";

const groupedModules = moduleSectionOrder.map((section, index) => ({
  section,
  sectionLabel: sectionLabelByIndex[index] ?? section,
  modules: moduleDefinitions.filter((moduleDefinition) => moduleDefinition.section === section)
}));

const resolvePhaseLabel = (phase: ModuleDefinition["phase"]): string => {
  if (phase === "phase-1") {
    return "首批";
  }
  if (phase === "phase-2") {
    return "扩展";
  }
  return "平台";
};

const resolveInitialModule = (): ModuleDefinition => {
  const hash = window.location.hash.replace("#", "");
  return (
    moduleDefinitions.find((moduleDefinition) => moduleDefinition.id === hash) ??
    moduleDefinitions[0]
  );
};

const initialPromptConfig = createDefaultSystemPromptConfig();
const defaultOperatorName = "云仲";

const App = () => {
  const [selectedModule, setSelectedModule] = useState<ModuleDefinition>(resolveInitialModule);
  const [operatorSession, setOperatorSession] = useState<OperatorSession | undefined>(() =>
    readOperatorSession()
  );
  const [points, setPoints] = useState(0);
  const [health, setHealth] = useState("checking");
  const [systemPrompts, setSystemPrompts] = useState<SystemPromptConfig>(initialPromptConfig);
  const [promptDraft, setPromptDraft] = useState<SystemPromptConfig>(initialPromptConfig);
  const [promptMenuOpen, setPromptMenuOpen] = useState(false);
  const [promptMenuBusy, setPromptMenuBusy] = useState(false);
  const [promptLoadError, setPromptLoadError] = useState("");
  const [promptActionError, setPromptActionError] = useState("");
  const [promptActionMessage, setPromptActionMessage] = useState("");
  const [selectedPromptModuleId, setSelectedPromptModuleId] = useState<SystemPromptModuleId>(
    systemPromptModuleIds[0]
  );
  const operator = operatorSession?.displayName ?? defaultOperatorName;

  const refreshPoints = async () => {
    if (!operatorSession) {
      return;
    }

    try {
      const snapshot = await fetchPoints(operatorSession.userId);
      setPoints(snapshot.points);
    } catch {
      setPoints(0);
    }
  };

  const loadSystemPromptConfig = async () => {
    try {
      const response = await fetchSystemPrompts();
      setSystemPrompts(response.prompts);
      setPromptDraft(response.prompts);
      setPromptLoadError("");
    } catch {
      const fallback = createDefaultSystemPromptConfig();
      setSystemPrompts(fallback);
      setPromptDraft(fallback);
      setPromptLoadError("读取系统提示词失败，当前已回退到内置默认值。");
    }
  };

  useEffect(() => {
    document.title = "幻裁";
  }, []);

  useEffect(() => {
    if (!operatorSession) {
      return;
    }

    void refreshPoints();
    void fetchHealth()
      .then((response) => setHealth(response.status))
      .catch(() => setHealth("down"));
    void loadSystemPromptConfig();
  }, [operatorSession]);

  useEffect(() => {
    const syncModuleFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      const matchedModule = moduleDefinitions.find(
        (moduleDefinition) => moduleDefinition.id === hash
      );

      if (matchedModule) {
        setSelectedModule(matchedModule);
      }
    };

    window.addEventListener("hashchange", syncModuleFromHash);
    return () => window.removeEventListener("hashchange", syncModuleFromHash);
  }, []);

  useEffect(() => {
    window.location.hash = selectedModule.id;
  }, [selectedModule]);

  const goToPreviousModule = () => {
    const currentIndex = moduleDefinitions.findIndex(
      (moduleDefinition) => moduleDefinition.id === selectedModule.id
    );
    if (currentIndex <= 0) {
      return;
    }
    setSelectedModule(moduleDefinitions[currentIndex - 1]);
  };

  const openPromptMenu = () => {
    setPromptDraft(cloneSystemPromptConfig(systemPrompts));
    setPromptActionError("");
    setPromptActionMessage("");
    setPromptMenuOpen(true);
  };

  const handlePromptFieldChange = (
    moduleId: SystemPromptModuleId,
    fieldKey: string,
    value: string
  ) => {
    setPromptDraft((current) => ({
      ...current,
      [moduleId]: {
        ...current[moduleId],
        [fieldKey]: value
      }
    }));
  };

  const handleSavePrompts = async () => {
    try {
      setPromptMenuBusy(true);
      setPromptActionError("");
      const response = await saveSystemPrompts({ prompts: promptDraft });
      setSystemPrompts(response.prompts);
      setPromptDraft(response.prompts);
      setPromptActionMessage("系统提示词已保存。");
      setPromptLoadError("");
    } catch (error) {
      setPromptActionMessage("");
      setPromptActionError(error instanceof Error ? error.message : "保存系统提示词失败");
    } finally {
      setPromptMenuBusy(false);
    }
  };

  const handleResetCurrentModule = async () => {
    try {
      setPromptMenuBusy(true);
      setPromptActionError("");
      const response = await resetSystemPrompts({ moduleId: selectedPromptModuleId });
      setSystemPrompts(response.prompts);
      setPromptDraft(response.prompts);
      setPromptActionMessage(
        `${resolveModuleLabel(selectedPromptModuleId)} 的系统提示词已恢复默认。`
      );
    } catch (error) {
      setPromptActionMessage("");
      setPromptActionError(error instanceof Error ? error.message : "恢复当前模块默认失败");
    } finally {
      setPromptMenuBusy(false);
    }
  };

  const handleResetAllPrompts = async () => {
    try {
      setPromptMenuBusy(true);
      setPromptActionError("");
      const response = await resetSystemPrompts();
      setSystemPrompts(response.prompts);
      setPromptDraft(response.prompts);
      setPromptActionMessage("全部系统提示词已恢复默认。");
    } catch (error) {
      setPromptActionMessage("");
      setPromptActionError(error instanceof Error ? error.message : "恢复全部默认失败");
    } finally {
      setPromptMenuBusy(false);
    }
  };

  const promptSummary = useMemo(
    () => `${systemPromptModuleIds.length} 个模块可配置`,
    []
  );

  const handleLogin = (displayName: string) => {
    const session = createOperatorSession(displayName);
    setOperatorSession(session);
  };

  const handleLogout = () => {
    clearOperatorSession();
    setOperatorSession(undefined);
    setPoints(0);
    setHealth("checking");
    setPromptMenuOpen(false);
  };

  if (!operatorSession) {
    return <LoginPage defaultName={defaultOperatorName} onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">HC</span>
          <div>
            <h1>幻裁</h1>
            <p>服装 AI 工作台</p>
          </div>
        </div>

        <div className="sidebar-user">欢迎，{operator}</div>

        <nav className="sidebar-nav">
          {groupedModules.map(({ section, sectionLabel, modules }) => (
            <section key={section} className="nav-section">
              <h2>{sectionLabel}</h2>
              <div className="nav-list">
                {modules.map((moduleDefinition) => (
                  <button
                    key={moduleDefinition.id}
                    type="button"
                    className={`nav-button ${
                      moduleDefinition.id === selectedModule.id ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedModule(moduleDefinition)}
                  >
                    <span className="nav-main-text">
                      {resolveModuleLabel(moduleDefinition.id, moduleDefinition.name)}
                    </span>
                    <small className="nav-side-text">
                      {moduleDefinition.id} · {resolvePhaseLabel(moduleDefinition.phase)}
                    </small>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <main className="content-shell">
        <header className="topbar app-topbar">
          <div>
            <span className="topbar-welcome">欢迎，{operator}</span>
          </div>
          <div className="topbar-status">
            <span className="points-chip">点数: {points}</span>
            <button type="button" className="toolbar-button" onClick={openPromptMenu}>
              系统提示词
            </button>
            <button type="button" className="toolbar-button" onClick={handleLogout}>
              退出
            </button>
            <span className="toolbar-summary">{promptSummary}</span>
            <span className={`status-chip status-${health}`}>API {health}</span>
          </div>
        </header>

        <div className="module-strip">
          <button type="button" className="back-button" onClick={goToPreviousModule}>
            ←
          </button>
          <div className="module-strip-text">
            <span className="eyebrow">当前模块</span>
            <h2>{resolveModuleLabel(selectedModule.id, selectedModule.name)}</h2>
          </div>
        </div>

        <div className="workspace">
          {selectedModule.id === "c9" ? (
            <HistoryWorkbench onDataChanged={() => void refreshPoints()} />
          ) : (
            <ModuleWorkbench
              module={selectedModule}
              systemPrompts={systemPrompts}
              onPointsChanged={setPoints}
              onDataChanged={() => void refreshPoints()}
            />
          )}
        </div>
      </main>

      <SystemPromptModal
        open={promptMenuOpen}
        prompts={promptDraft}
        selectedModuleId={selectedPromptModuleId}
        busy={promptMenuBusy}
        loadError={promptLoadError}
        actionError={promptActionError}
        actionMessage={promptActionMessage}
        onClose={() => setPromptMenuOpen(false)}
        onSelectModule={setSelectedPromptModuleId}
        onFieldChange={handlePromptFieldChange}
        onSave={() => void handleSavePrompts()}
        onResetModule={() => void handleResetCurrentModule()}
        onResetAll={() => void handleResetAllPrompts()}
      />
    </div>
  );
};

export default App;
