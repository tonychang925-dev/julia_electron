import React, { useState, useCallback } from 'react';

/**
 * Simple view router — no library needed for Phase E0.5.
 * Views: chat, memory, tools, workspace, settings.
 */
const VIEWS = {
  chat: 'chat',
  memory: 'memory',
  tools: 'tools',
  workspace: 'workspace',
  settings: 'settings',
};

export { VIEWS };

export function useRouter(initial = 'chat') {
  const [view, setView] = useState(initial);

  const navigate = useCallback((v) => {
    if (VIEWS[v]) setView(v);
  }, []);

  return { view, navigate, VIEWS };
}
