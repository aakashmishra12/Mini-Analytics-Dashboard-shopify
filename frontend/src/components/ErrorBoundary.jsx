import { Component } from 'react';
import { ErrorState } from './States.jsx';

/** Keeps a render failure in one section from blanking the whole dashboard. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Section failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card">
          <ErrorState
            error={{ message: 'This section ran into an unexpected error while rendering.' }}
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
