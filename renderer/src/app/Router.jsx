import { useState, useCallback } from 'react';

const VIEWS = {
  chat: 'chat',
  memory: 'memory',
  tools: 'tools',
  workspace: 'workspace',
  settings: 'settings',
  test: 'test',
};

export { VIEWS };

export function useRouter(initial = 'chat') {
  const [view, setView] = useState(initial);
  const navigate = useCallback((v) => { if (VIEWS[v]) setView(v); }, []);
  return { view, navigate, VIEWS };
}
