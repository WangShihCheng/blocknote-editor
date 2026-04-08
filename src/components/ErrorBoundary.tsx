import { Component } from "react";
import type { ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.error("編輯器發生非預期錯誤:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "24px", textAlign: "center", color: "#6b6b8a" }}>
          <p>⚠️ 編輯器發生異常，請嘗試重新整理頁面以恢復正常。</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: "10px", padding: "6px 12px" }}>重新整理</button>
        </div>
      );
    }
    return this.props.children;
  }
}
