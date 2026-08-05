import React, { useState } from 'react';
import Sidebar from './layout/Sidebar';
import Status from './Status';
import ConversationList from './conversation/ConversationList';
import ChatView from './conversation/ChatView';
import MemoryPanel from './memory/MemoryPanel';
import ToolPanel from './tools/ToolPanel';
import WorkspacePanel from './workspace/WorkspacePanel';
import SettingsPanel from './settings/SettingsPanel';
import { useRouter } from './app/Router';

export default function App() {
  const { view, navigate, VIEWS } = useRouter('chat');
  const [activeSessionId, setActiveSessionId] = useState(null);

  const renderView = () => {
    switch (view) {
      case VIEWS.chat:
        return (
          <div style={styles.chatLayout}>
            <ConversationList
              onSelect={(id) => setActiveSessionId(id)}
              onNew={(id) => setActiveSessionId(id)}
            />
            <div style={styles.chatMain}>
              <ChatView sessionId={activeSessionId} />
            </div>
          </div>
        );
      case VIEWS.memory:
        return <MemoryPanel />;
      case VIEWS.tools:
        return <ToolPanel />;
      case VIEWS.workspace:
        return <WorkspacePanel />;
      case VIEWS.settings:
        return <SettingsPanel />;
      default:
        return <ChatView />;
    }
  };

  return (
    <div style={styles.shell}>
      <Sidebar currentView={view} onNavigate={navigate} />
      <div style={styles.main}>
        <Status />
        <div style={styles.content}>
          {renderView()}
        </div>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    height: '100vh',
    display: 'flex',
    WebkitAppRegion: 'drag',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    WebkitAppRegion: 'no-drag',
  },
  chatLayout: {
    display: 'flex',
    height: '100%',
  },
  chatMain: {
    flex: 1,
    minWidth: 0,
  },
};

