import { useState } from 'react';
import SegmentedControl from './components/SegmentedControl.jsx';
import ChatView from './components/ChatView.jsx';
import ClassicFlow from './components/ClassicFlow.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import ReportsRail from './components/ReportsRail.jsx';
import Button from './components/Button.jsx';
import Icon from './components/Icon.jsx';

const VIEW_STORAGE_KEY = 'rexor-view';
const CHAT_ID_STORAGE_KEY = 'rexor-chat-conversation-id';

function loadView() {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    return v === 'classic' ? 'classic' : 'chat';
  } catch (e) {
    return 'chat';
  }
}

function loadConversationId() {
  try {
    return sessionStorage.getItem(CHAT_ID_STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

function saveConversationId(id) {
  try {
    sessionStorage.setItem(CHAT_ID_STORAGE_KEY, id);
  } catch (e) {
    // private browsing / storage blocked - fine, the thread just won't
    // survive a page reload in that case.
  }
}

export default function App() {
  const [view, setView] = useState(loadView);
  const [conversationId, setConversationId] = useState(loadConversationId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportsVersion, setReportsVersion] = useState(0);
  const bumpReports = () => setReportsVersion((v) => v + 1);

  function changeView(v) {
    setView(v);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch (e) {
      // private browsing / storage blocked - fine, just won't stick across reloads.
    }
  }

  function changeConversationId(id) {
    setConversationId(id);
    saveConversationId(id);
  }

  return (
    <div className="rx-app">
      <div className="topbar">
        <div className="topbar-brand">
          <img className="logo-light" src="/rexor-logo.svg" alt="Rexor" />
          <img className="logo-dark" src="/rexor-logo-dark.svg" alt="Rexor" />
          <span className="topbar-tag">RED TEAM CONSOLE</span>
        </div>
        <div className="topbar-actions">
          <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} type="button">
            <Icon name="clock" size={16} />
            History
          </Button>
          <SegmentedControl
            label="View"
            value={view}
            onChange={changeView}
            options={[
              { value: 'chat', label: 'Chat' },
              { value: 'classic', label: 'Form' }
            ]}
          />
        </div>
      </div>

      <div className="rx-main">
        {view === 'chat' ? (
          <ChatView conversationId={conversationId} onConversationIdChange={changeConversationId} onReportCreated={bumpReports} />
        ) : (
          <ClassicFlow onReportCreated={bumpReports} />
        )}
        <ReportsRail refreshKey={reportsVersion} />
      </div>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        refreshKey={reportsVersion}
        onSelectChat={(id) => {
          changeConversationId(id);
          changeView('chat');
        }}
      />
    </div>
  );
}
