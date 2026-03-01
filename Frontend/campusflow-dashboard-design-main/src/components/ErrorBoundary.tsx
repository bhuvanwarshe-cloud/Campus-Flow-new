import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center p-4 text-center">
                    <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
                        <p className="text-sm text-red-700 max-w-md">
                            The application encountered an unexpected error.
                        </p>
                        {this.state.error && (
                            <pre className="mt-4 p-2 bg-white rounded text-xs text-left overflow-auto max-w-xl border border-red-100 text-red-800">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={() => window.location.href = '/'}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                        >
                            Return to Home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
