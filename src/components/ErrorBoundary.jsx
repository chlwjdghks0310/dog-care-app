import { Component } from "react";
import { reportError } from "../services/beta";

// 탭 화면 하나가 그리다 터져도 앱 전체가 흰 화면이 되지 않게(11/11 점검 #2). 오류는 자동 보고되고, [다시 시도]로 그 화면만 다시 그린다
export default class ErrorBoundary extends Component {
  state = { error: null };
  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); // 다른 화면으로 가면 풀린다
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    reportError(`화면 오류: ${error?.message || error}`, error?.stack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen">
        <div className="card" style={{ marginTop: 24, textAlign: "center" }}>
          <div className="h2">이 화면을 그리다 문제가 생겼어요</div>
          <p className="subtle" style={{ margin: "6px 0 14px" }}>기록은 그대로 있어요. 다시 시도해도 안 되면 설정 → 의견 보내기로 알려 주세요.</p>
          <button type="button" className="btn-primary" onClick={() => this.setState({ error: null })}>다시 시도</button>
          {this.props.onHome && <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => (this.setState({ error: null }), this.props.onHome())}>오늘 화면으로</button>}
        </div>
      </div>
    );
  }
}
