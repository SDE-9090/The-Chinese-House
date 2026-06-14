import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message + "\n" + error.stack };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", background: "#fee", color: "red", borderRadius: "8px", margin: "20px" }}>
          <h2>Oops, there was an error!</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px", fontFamily: "monospace" }}>{this.state.errorMsg}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
