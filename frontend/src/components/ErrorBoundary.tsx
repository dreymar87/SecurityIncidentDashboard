import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}]`, err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="card flex items-center gap-3 text-sm text-red-400 border border-red-500/20">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            {this.props.label ? `${this.props.label} failed to render` : 'This section failed to render'}.{' '}
            <button
              className="underline hover:no-underline"
              onClick={() => this.setState({ hasError: false, message: '' })}
            >
              Retry
            </button>
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}
