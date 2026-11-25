import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * 视图层异常兜底：避免单个组件异常导致整个画布白屏。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[linkmind] 页面渲染异常:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="lm-fatal">
          <div className="lm-fatal-card">
            <div className="lm-fatal-title">页面出现异常</div>
            <p className="lm-fatal-desc">
              {this.state.message || '未知错误'}，本地数据已自动保存，刷新后可继续操作。
            </p>
            <button type="button" className="lm-fatal-btn" onClick={this.handleReload}>
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
