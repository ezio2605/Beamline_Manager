// RAG-Enhanced Sync Engine Component
import React, { useState, useEffect } from 'react';
import { ComparisonEngine } from '../services/ComparisonEngine';
import { VectorStoreService } from '../services/VectorStoreService';
import { DocumentProcessor } from '../services/DocumentProcessor';
import { FileStorageService } from '../services/FileStorageService';
import { ApiClient } from '../src/api/client';
import type {
  ComparisonResult,
  IndexingProgress,
  VectorStoreStatus,
  RAGSimilarityResult
} from '../types';

interface SyncEngineProps {
  onActiveWorkChange?: (hasActiveWork: boolean) => void;
}

const SyncEngine: React.FC<SyncEngineProps> = ({ onActiveWorkChange }) => {
  const [selectedBeamlineId, setSelectedBeamlineId] = useState<string>('BL01');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [activeResult, setActiveResult] = useState<ComparisonResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // RAG-specific state
  const [vectorStoreStatus, setVectorStoreStatus] = useState<VectorStoreStatus>({
    isInitialized: false,
    documentCount: 0,
    lastIndexed: null,
    beamlinesIndexed: [],
  });
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgress | null>(null);

  // Sample beamlines
  const beamlines = [
    'BL01', 'BL02', 'BL03', 'BL04', 'BL05', 'BL06', 'BL07', 'BL08',
    'BL09', 'BL10', 'BL11', 'BL12', 'BL13', 'BL14', 'BL15', 'BL16',
    'BL17', 'BL18', 'BL19', 'BL20', 'BL21', 'BL22', 'BL23', 'BL24',
    'BL25', 'BL26'
  ];

  const filteredBeamlines = beamlines.filter(bl =>
    bl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize RAG on component mount
  useEffect(() => {
    const initRAG = async () => {
      try {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
        await ComparisonEngine.initializeRAG(apiKey);

        const vectorStore = ComparisonEngine.getVectorStore();
        if (vectorStore && vectorStore.isReady()) {
          setVectorStoreStatus(prev => ({
            ...prev,
            isInitialized: true,
          }));
        }
      } catch (error) {
        console.error('Failed to initialize RAG:', error);
      }
    };

    // initRAG(); // Disabled - all RAG handled by backend now
  }, []);

  // Add confirmation dialog when user tries to refresh the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show confirmation dialog if there are uploaded files or comparison results
      if (uploadedFiles.length > 0 || comparisonResults.length > 0 || isAnalyzing) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = 'Are you sure you want to leave? All progress will be lost and you will need to start over.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uploadedFiles, comparisonResults, isAnalyzing]);

  // Notify parent component when active work status changes
  useEffect(() => {
    const hasActiveWork = uploadedFiles.length > 0 || comparisonResults.length > 0 || isAnalyzing;
    onActiveWorkChange?.(hasActiveWork);
  }, [uploadedFiles, comparisonResults, isAnalyzing, onActiveWorkChange]);

  // Handle JASRI file upload
  const handleJasriFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsIndexing(true);
    setIndexingProgress({
      current: 0,
      total: files.length,
      currentFile: 'Uploading files...',
      status: 'indexing',
    });

    try {
      // Upload files to backend
      const uploadedJasriFiles = await ApiClient.uploadJasriFiles(selectedBeamlineId, files);

      setIndexingProgress({
        current: files.length,
        total: files.length,
        currentFile: 'Upload complete!',
        status: 'completed',
      });

      alert(`Successfully uploaded ${uploadedJasriFiles.length} JASRI file(s)!`);
      setTimeout(() => setIndexingProgress(null), 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setIndexingProgress({
        current: 0,
        total: 0,
        currentFile: 'Error',
        status: 'error',
        error: String(error),
      });
      alert('Upload failed. Please try again.');
    } finally {
      setIsIndexing(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Handle Nichi file upload
  const handleNichiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(files);
  };

  // Index JASRI files into vector store
  const indexJasriFiles = async () => {
    setIsIndexing(true);
    setIndexingProgress({
      current: 0,
      total: 0,
      currentFile: 'Starting indexing...',
      status: 'indexing',
    });

    try {
      const result = await ApiClient.indexJasriFiles(selectedBeamlineId);

      setIndexingProgress({
        current: result.indexedFiles.length,
        total: result.indexedFiles.length,
        currentFile: 'Indexing complete!',
        status: 'completed',
      });

      setVectorStoreStatus(prev => ({
        ...prev,
        documentCount: result.stats.totalDocuments,
        lastIndexed: new Date().toISOString(),
        beamlinesIndexed: [...new Set([...prev.beamlinesIndexed, selectedBeamlineId])],
      }));

      alert(`Successfully indexed ${result.indexedFiles.length} file(s)!`);
      setTimeout(() => setIndexingProgress(null), 3000);
    } catch (error) {
      console.error('Indexing failed:', error);
      setIndexingProgress({
        current: 0,
        total: 0,
        currentFile: 'Error',
        status: 'error',
        error: String(error),
      });
      alert('Indexing failed. Please check that files are uploaded first.');
    } finally {
      setIsIndexing(false);
    }
  };

  // Start RAG-based comparison
  const startComparison = async () => {
    if (uploadedFiles.length === 0) return;

    setIsAnalyzing(true);
    setComparisonResults([]);

    try {
      // First, upload the Nichi files
      const uploadedNichiFiles = await ApiClient.uploadNichiFiles(
        selectedBeamlineId,
        uploadedFiles
      );

      // Then compare them
      const nichiFileIds = uploadedNichiFiles.map(f => f.id);
      const comparisonData = await ApiClient.compareFiles(selectedBeamlineId, nichiFileIds);

      // Convert API results to component format
      const results: ComparisonResult[] = comparisonData.results.map(r => ({
        id: r.id,
        jasriFile: r.jasriFileId ? { filename: 'JASRI file', id: r.jasriFileId } as any : null,
        nichiFile: {
          id: r.nichiFileId,
          filename: uploadedFiles.find((_, i) => uploadedNichiFiles[i]?.id === r.nichiFileId)?.name || 'Nichi file',
          beamlineId: r.beamlineId,
        } as any,
        beamlineId: r.beamlineId,
        case: r.case,
        timestamp: r.timestamp,
        jasriContent: '',
        nichiContent: '',
        differences: r.differences,
        aiInsights: r.aiInsights,
        actionTaken: r.actionTaken,
        resultPath: '',
      }));

      setComparisonResults(results);
      if (results.length > 0) {
        setActiveResult(results[0]);
      }

      // Clear uploaded files
      setUploadedFiles([]);
    } catch (error: any) {
      console.error('Comparison failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Comparison failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Extract RAG similarity results from AI insights
  const extractRAGResults = (result: ComparisonResult): RAGSimilarityResult[] => {
    // This is a simplified extraction - in real implementation, 
    // we'd parse the aiInsights or store RAG results separately
    return [];
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      {/* Sidebar - Beamline Selector */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          {/* <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-3">
            26 Beamline Cluster
          </h3> */}
          {/* <div className="relative">
            <input
              type="text"
              placeholder="Search beamline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400"></i>
          </div> */}
          <div className="relative w-full [360px]">
            <input
              type="text"
              placeholder="Search beamline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-white border-2 border-slate-100 rounded-2xl shadow-lg focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none text-slate-800 font-semibold text-sm"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-300 text-lg"></i>
          </div>


        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {filteredBeamlines.map(bl => (
            <button
              key={bl}
              onClick={() => {
                setSelectedBeamlineId(bl);
                setActiveResult(null);
                setComparisonResults([]);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all ${selectedBeamlineId === bl
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'hover:bg-slate-50 text-slate-700'
                }`}
            >
              <div className="flex flex-col">
                <span className="font-bold text-sm">{bl}</span>
                <span className={`text-[10px] ${selectedBeamlineId === bl ? 'text-indigo-200' : 'text-slate-400'
                  }`}>
                  {vectorStoreStatus.beamlinesIndexed.includes(bl) ? '✓ Indexed' : 'Not indexed'}
                </span>
              </div>
              {selectedBeamlineId === bl && <i className="fa-solid fa-chevron-right text-xs"></i>}
            </button>
          ))}
        </div>

        {/* Vector Store Status */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span>Vector Store:</span>
              <span className={`font-bold ${vectorStoreStatus.isInitialized ? 'text-emerald-600' : 'text-slate-400'}`}>
                {vectorStoreStatus.isInitialized ? '✓ Ready' : '○ Not Ready'}
              </span>
            </div>
            {vectorStoreStatus.lastIndexed && (
              <div className="flex items-center justify-between">
                <span>Last Indexed:</span>
                <span className="font-mono text-[10px]">
                  {new Date(vectorStoreStatus.lastIndexed).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Controls Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <i className="fa-solid fa-brain text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
                {selectedBeamlineId} Workspace
              </h2>
              {/* <p className="text-xs text-slate-500">
                RAG-enhanced semantic comparison with vector similarity search
              </p> */}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={indexJasriFiles}
              disabled={isIndexing}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isIndexing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200'
                }`}
            >
              {isIndexing ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  Indexing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-database"></i>
                  Index JASRI Files
                </>
              )}
            </button>

            <div className="relative">
              <input
                type="file"
                id="jasri-upload"
                className="hidden"
                onChange={handleJasriFileUpload}
                accept=".pdf,.docx,.doc,.txt,.md"
                multiple
              />
              <label
                htmlFor="jasri-upload"
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-200"
              >
                <i className="fa-solid fa-file-arrow-up"></i>
                Upload JASRI Files
              </label>
            </div>

            <div className="relative">
              <input
                type="file"
                id="nichi-upload"
                className="hidden"
                onChange={handleNichiFileUpload}
                accept=".pdf,.docx,.doc,.txt,.md"
                multiple
              />
              <label
                htmlFor="nichi-upload"
                className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-200 flex items-center gap-2"
              >
                <i className="fa-solid fa-cloud-arrow-up"></i>
                {uploadedFiles.length > 0
                  ? `${uploadedFiles.length} file(s)`
                  : 'Upload Nichi Files'}
              </label>
            </div>

            <button
              type="button"
              onClick={startComparison}
              disabled={uploadedFiles.length === 0 || isAnalyzing}
              className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${uploadedFiles.length === 0 || isAnalyzing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                }`}
            >
              {isAnalyzing ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  Analyzing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  Compare
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Indexing Progress */}
          {indexingProgress && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                  <i className="fa-solid fa-database text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">
                    {indexingProgress.status === 'completed' ? 'Indexing Complete' : 'Indexing JASRI Files'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {indexingProgress.currentFile}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {indexingProgress.current}/{indexingProgress.total}
                  </div>
                  <div className="text-xs text-slate-500">documents</div>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${indexingProgress.total > 0 ? (indexingProgress.current / indexingProgress.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!activeResult && !isAnalyzing && comparisonResults.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <i className="fa-solid fa-brain text-6xl mb-4 animate-pulse"></i>
              <p className="text-lg font-medium">RAG-Enhanced Comparison Engine</p>
              <p className="text-sm">1. Index JASRI files into vector store</p>
              <p className="text-sm">2. Upload Nichi files for semantic comparison</p>
              <p className="text-sm">3. AI will retrieve similar documents and analyze</p>
            </div>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-300"></div>
              </div>
              <p className="text-slate-600 font-bold">
                RAG system retrieving similar documents and performing semantic analysis...
              </p>
            </div>
          )}

          {/* Comparison Results */}
          {activeResult && (
            <div className="space-y-6">
              {/* Result Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeResult.case === 'case2' ? 'bg-emerald-100 text-emerald-600' :
                    activeResult.case === 'case3' ? 'bg-indigo-100 text-indigo-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                    <i className={`fa-solid ${activeResult.case === 'case2' ? 'fa-check' : 'fa-code-compare'
                      } text-xl`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-800 text-lg uppercase tracking-tight">
                        {activeResult.case === 'case1' ? 'UPDATE' :
                          activeResult.case === 'case2' ? 'MATCH' : 'NEW'}
                      </h3>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px] font-bold uppercase tracking-wider">
                        RAG-Enhanced
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{activeResult.actionTaken}</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700">
                      <div className="font-bold text-indigo-600 mb-2">AI Insights:</div>
                      <div className="whitespace-pre-wrap">{activeResult.aiInsights}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Comparison */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                    JASRI Content
                  </h4>
                  <div className="bg-slate-900 text-indigo-100 p-6 rounded-2xl h-96 overflow-auto font-mono text-xs leading-relaxed border border-slate-800">
                    {activeResult.jasriContent || 'No JASRI file found'}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                    Nichi Content
                  </h4>
                  <div className="bg-white border-2 border-indigo-100 p-6 rounded-2xl h-96 overflow-auto font-mono text-xs leading-relaxed text-slate-700 shadow-inner">
                    {activeResult.nichiContent}
                  </div>
                </div>
              </div>

              {/* All Results List */}
              {comparisonResults.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">All Comparison Results</h3>
                  <div className="space-y-2">
                    {comparisonResults.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => setActiveResult(result)}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all ${activeResult.id === result.id
                          ? 'bg-indigo-100 border-2 border-indigo-300'
                          : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                      >
                        <div>
                          <div className="font-bold text-sm">{result.nichiFile.filename}</div>
                          <div className="text-xs text-slate-500">
                            Case: {result.case.toUpperCase()}
                          </div>
                        </div>
                        <i className="fa-solid fa-chevron-right text-xs text-slate-400"></i>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SyncEngine;
