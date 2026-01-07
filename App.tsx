
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import BeamlineExplorer from './components/BeamlineExplorer';
import StructuralAuditor from './components/StructuralAuditor';
import SyncEngine from './components/SyncEngine';
import { ViewState } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.DASHBOARD);

  const renderContent = () => {
    switch (activeView) {
      case ViewState.DASHBOARD:
        return <Dashboard onNavigate={setActiveView} />;
      case ViewState.EXPLORER:
        return <BeamlineExplorer />;
      case ViewState.AUDITOR:
        return <StructuralAuditor />;
      case ViewState.SYNC:
        return <SyncEngine />;
      default:
        return <Dashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
