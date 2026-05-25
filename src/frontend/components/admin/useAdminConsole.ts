"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAdminConsole(initialMessage?: string) {
  const [consoleLogs, setConsoleLogs] = useState<string[]>(
    initialMessage ? [initialMessage] : []
  );
  const consoleContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop =
        consoleContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  return { consoleLogs, consoleContainerRef, addLog };
}
