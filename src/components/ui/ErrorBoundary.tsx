'use client';
// F-06 · an error boundary: a throw while its children render (or in their effects) shows `fallback` in their place
// instead of taking the whole page down. As it catches it logs the error with the component stack (lib/errorLog.ts),
// calls the recovery writer (lib/recovery.ts) and then `onError`. It does not reset itself: give it a `key` that
// changes when what it holds should be tried again (Panels.tsx keys it by the panel).
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logError } from '@/lib/errorLog';
import { writeRecovery } from '@/lib/recovery';

interface Props {
  /** what it guards, as the error log names it */
  name: string;
  fallback: ReactNode;
  onError?: (error: unknown) => void;
  children: ReactNode;
}

export default class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    logError(error, this.props.name, info.componentStack ?? '');
    writeRecovery();
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
