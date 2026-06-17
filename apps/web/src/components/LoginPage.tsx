import { useState } from "react";

type LoginPageProps = {
  defaultName: string;
  onLogin: (displayName: string) => void;
};

export const LoginPage = ({ defaultName, onLogin }: LoginPageProps) => {
  const [displayName, setDisplayName] = useState(defaultName);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin(displayName);
  };

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark login-brand-mark">HC</span>
          <div>
            <h1>幻裁</h1>
            <p>服装 AI 工作台</p>
          </div>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-head">
            <span className="login-kicker">Operator Login</span>
            <h2>进入工作台</h2>
            <p>使用本地操作员身份进入系统，用户名会显示在顶部和侧边栏。</p>
          </div>

          <label className="login-field">
            <span>操作员名称</span>
            <input
              className="text-input login-input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例如：云仲"
              autoFocus
            />
          </label>

          <button type="submit" className="primary-button login-submit">
            登录工作台
          </button>
        </form>
      </section>
    </main>
  );
};
