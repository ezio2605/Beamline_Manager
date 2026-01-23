
import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import BeamlineExplorer from './components/BeamlineExplorer';
import StructuralAuditor from './components/StructuralAuditor';
import SyncEngine from './components/SyncEngine';
import StandardStructureManager from './components/StandardStructureManager';
import SemanticComparisonDashboard from './components/SemanticComparisonDashboard';
import { ViewState } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.DASHBOARD);
  const syncEngineHasActiveWorkRef = useRef<() => boolean>(() => false);

  const handleViewChange = (newView: ViewState) => {
    // If leaving Sync Machine, check if there's active work
    if (activeView === ViewState.SYNC && newView !== ViewState.SYNC) {
      const hasActiveWork = syncEngineHasActiveWorkRef.current();

      if (hasActiveWork) {
        const confirmed = window.confirm(
          'Are you sure you want to leave? All progress will be lost and you will need to start over.'
        );

        if (!confirmed) {
          return; // Don't change view
        }
      }
    }

    setActiveView(newView);
  };

  const renderContent = () => {
    switch (activeView) {
      case ViewState.DASHBOARD:
        return <Dashboard onNavigate={handleViewChange} />;
      case ViewState.EXPLORER:
        return <BeamlineExplorer />;
      case ViewState.AUDITOR:
        return <StructuralAuditor />;
      case ViewState.SYNC:
        return <SyncEngine onActiveWorkChange={(hasWork) => {
          syncEngineHasActiveWorkRef.current = () => hasWork;
        }} />;
      case ViewState.STANDARD_STRUCTURE:
        return <StandardStructureManager />;
      case ViewState.SEMANTIC_COMPARISON:
        return <SemanticComparisonDashboard />;
      default:
        return <Dashboard onNavigate={handleViewChange} />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={handleViewChange}>
      {renderContent()}
    </Layout>
  );
};

export default App;
