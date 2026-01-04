// @ts-nocheck
import React from 'react';
import TerminalRecovery from './TerminalRecovery';

interface Props {
  children: React.ReactNode;
  onResetCheckout: () => void;
  snapshot?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

class TerminalErrorBoundary extends React.Component<Props, State> {
  // Fix: Initializing state in the constructor to ensure proper typing and inheritance initialization
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      info: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Fix: Static method required for error boundaries to update state based on the error
    return { hasError: true, error, info: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Terminal Uncaught Error:", error, errorInfo);
    // Fix: Accessing setState which is inherited from React.Component
    this.setState({ info: errorInfo });
    
    // Persist logs for audit
    const logs = JSON.parse(localStorage.getItem('fintab_error_logs') || '[]');
    logs.push({
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context: 'Terminal/Checkout',
        // Fix: Accessing props which is inherited from React.Component
        snapshot: this.props.snapshot
    });
    localStorage.setItem('fintab_error_logs', JSON.stringify(logs.slice(-10)));
  }

  private resetErrorBoundary = () => {
    // Fix: Accessing setState which is inherited from React.Component
    this.setState({ hasError: false, error: null, info: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      return (
        <TerminalRecovery 
          error={this.state.error} 
          info={this.state.info}
          // Fix: Accessing props which is inherited from React.Component
          snapshot={this.props.snapshot}
          resetErrorBoundary={this.resetErrorBoundary}
          // Fix: Accessing props which is inherited from React.Component
          onResetCheckout={this.props.onResetCheckout}
        />
      );
    }

    // Fix: children is part of the inherited props member
    return this.props.children;
  }
}

export default TerminalErrorBoundary;
