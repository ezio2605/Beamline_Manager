import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import type { MissingElementsReport, StandardStructure } from '../types';

const API_BASE = '/api';

interface UploadedDocument {
    documentId: string;
    filename: string;
    beamlineId: string;
    totalChunks: number;
    status: 'uploaded' | 'analyzing' | 'complete';
}

interface SemanticComparisonDashboardProps {
    onActiveDocumentsChange?: (hasDocuments: boolean) => void;
}

const SemanticComparisonDashboard: React.FC<SemanticComparisonDashboardProps> = ({ onActiveDocumentsChange }) => {
    const [activeStructure, setActiveStructure] = useState<StandardStructure | null>(null);
    const [documents, setDocuments] = useState<UploadedDocument[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [beamlineId, setBeamlineId] = useState('BL01');
    const [vendor, setVendor] = useState('JASRI');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [report, setReport] = useState<any | null>(null);
    const [question, setQuestion] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ question: string, answer: string, sources?: any[] }>>([]);
    const [isAsking, setIsAsking] = useState(false);
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
    const [isCombinedReport, setIsCombinedReport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 26 beamlines list
    const beamlines = [
        'BL01', 'BL02', 'BL03', 'BL04', 'BL05', 'BL06', 'BL07', 'BL08',
        'BL09', 'BL10', 'BL11', 'BL12', 'BL13', 'BL14', 'BL15', 'BL16',
        'BL17', 'BL18', 'BL19', 'BL20', 'BL21', 'BL22', 'BL23', 'BL24',
        'BL25', 'BL26'
    ];

    useEffect(() => {
        loadActiveStructure();
    }, []);

    // Notify parent component when documents state changes
    useEffect(() => {
        if (onActiveDocumentsChange) {
            onActiveDocumentsChange(documents.length > 0);
        }
    }, [documents, onActiveDocumentsChange]);

    useEffect(() => {
        // Poll for document status only for analyzing documents
        const interval = setInterval(() => {
            documents.forEach(doc => {
                if (doc.status === 'analyzing') {
                    checkDocumentStatus(doc.documentId);
                }
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [documents]);

    const loadActiveStructure = async () => {
        try {
            const res = await axios.get(`${API_BASE}/standard-structure`);
            setActiveStructure(res.data.data);
        } catch (err) {
            console.error('No active structure found');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        } else {
            // User cancelled file selection
            setSelectedFile(null);
        }
    };

    const handleFileInputClick = () => {
        // Clear the input value to ensure onChange fires even for the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadFile = async () => {
        if (!selectedFile || !beamlineId) {
            setError('Please select a file and enter a beamline ID');
            return;
        }

        if (!activeStructure) {
            setError('No active standard structure found. Please create and activate a structure first.');
            return;
        }

        try {
            setIsUploading(true);
            setError(null);
            setSuccessMessage(null);

            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('beamlineId', beamlineId);
            formData.append('vendor', vendor);

            const res = await axios.post(`${API_BASE}/semantic-comparison/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newDoc: UploadedDocument = {
                documentId: res.data.data.documentId,
                filename: res.data.data.filename,
                beamlineId: res.data.data.beamlineId,
                totalChunks: res.data.data.totalChunks,
                status: 'uploaded'
            };

            setDocuments(prev => [...prev, newDoc]);
            // Auto-select newly uploaded document for analysis
            setSelectedDocs(prev => new Set([...prev, newDoc.documentId]));

            // Show success message
            setSuccessMessage(`✓ ${selectedFile.name} uploaded successfully! You can upload another file.`);

            // Clear file selection and reset input
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Auto-clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);

            // Don't clear beamlineId to allow multiple uploads for same beamline
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const analyzeDocument = async (documentId: string) => {
        try {
            setError(null);

            // Update document status to show it's being analyzed
            setDocuments(prev => prev.map(doc =>
                doc.documentId === documentId
                    ? { ...doc, status: 'analyzing' }
                    : doc
            ));

            // Trigger analysis via the new endpoint
            await axios.post(`${API_BASE}/semantic-comparison/${documentId}/analyze`);

            // Start polling for status
            const pollInterval = setInterval(async () => {
                const status = await checkDocumentStatus(documentId);
                if (status?.isComplete) {
                    clearInterval(pollInterval);
                }
            }, 2000);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze document');
        }
    };

    const analyzeBatch = async () => {
        if (selectedDocs.size === 0) {
            setError('Please select at least one document to analyze');
            return;
        }

        try {
            setIsAnalyzingBatch(true);
            setError(null);

            const docIds = Array.from(selectedDocs) as string[];

            // Call the new batch analysis endpoint
            await axios.post(`${API_BASE}/semantic-comparison/analyze-batch`, {
                documentIds: docIds
            });

            // Start polling for combined report status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await axios.post(`${API_BASE}/semantic-comparison/batch-status`, {
                        documentIds: docIds
                    });

                    if (statusRes.data.data.isComplete) {
                        clearInterval(pollInterval);
                        // Load the combined report
                        await loadCombinedReport(docIds);
                        setIsAnalyzingBatch(false);
                    }
                } catch (err) {
                    console.error('Error polling status:', err);
                }
            }, 3000);

            // Clear timeout after 2 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
                setIsAnalyzingBatch(false);
            }, 120000);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to analyze documents');
            setIsAnalyzingBatch(false);
        }
    };

    const toggleDocSelection = (documentId: string) => {
        setSelectedDocs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(documentId)) {
                newSet.delete(documentId);
            } else {
                newSet.add(documentId);
            }
            return newSet;
        });
    };

    const checkDocumentStatus = async (documentId: string) => {
        try {
            const res = await axios.get(`${API_BASE}/semantic-comparison/${documentId}/status`);
            const statusData = res.data.data;

            setDocuments(prev => prev.map(doc =>
                doc.documentId === documentId
                    ? { ...doc, status: statusData.isComplete ? 'complete' : doc.status }
                    : doc
            ));

            return statusData;
        } catch (err) {
            console.error('Error checking status:', err);
            return null;
        }
    };

    const loadReport = async (documentId: string) => {
        try {
            const res = await axios.get(`${API_BASE}/semantic-comparison/${documentId}/missing-elements`);
            console.log('📄 Loaded report:', res.data.data);
            console.log('📋 Recommendations:', res.data.data.recommendations);
            setReport(res.data.data);
            setSelectedDocIds([documentId]);
            setIsCombinedReport(false);
            setChatHistory([]);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load report');
        }
    };

    const loadCombinedReport = async (documentIds: string[]) => {
        try {
            const res = await axios.post(`${API_BASE}/semantic-comparison/combined-report`, {
                documentIds
            });
            console.log('📄 Loaded combined report:', res.data.data);
            console.log('📋 Recommendations:', res.data.data.recommendations);
            setReport(res.data.data);
            setSelectedDocIds(documentIds);
            setIsCombinedReport(true);
            setChatHistory([]);
            // Clear selection checkboxes after loading report
            setSelectedDocs(new Set());
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load combined report');
        }
    };

    const deleteDocument = async (documentId: string) => {
        if (!confirm('Delete this document and all its data?')) return;

        try {
            await axios.delete(`${API_BASE}/semantic-comparison/${documentId}`);
            setDocuments(prev => prev.filter(doc => doc.documentId !== documentId));
            if (selectedDocIds.includes(documentId)) {
                setSelectedDocIds([]);
                setReport(null);
                setChatHistory([]);
                setIsCombinedReport(false);
            }
        } catch (err) {
            setError('Failed to delete document');
        }
    };

    const askQuestion = async () => {
        if (!question.trim() || selectedDocIds.length === 0) return;

        try {
            setIsAsking(true);
            setError(null);

            const res = await axios.post(`${API_BASE}/semantic-comparison/${selectedDocIds[0]}/ask`, {
                question: question.trim(),
                documentIds: selectedDocIds
            });

            setChatHistory(prev => [...prev, {
                question: question.trim(),
                answer: res.data.data.answer,
                sources: res.data.data.sources
            }]);
            setQuestion('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to get answer');
        } finally {
            setIsAsking(false);
        }
    };

    // Format answer to clean up markdown
    const formatAnswer = (text: string): string => {
        return text
            .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold **text**
            .replace(/\*(.+?)\*/g, '$1')     // Remove italic *text*
            .replace(/^[-*•]\s+/gm, '• ')    // Normalize bullet points
            .trim();
    };

    return (
        <div className="p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Semantic Manual Comparison</h1>
                {/* <p className="text-slate-600">Upload and analyze beamline manuals against standard structure</p> */}
            </div>

            {/* Active Structure Status */}
            {activeStructure ? (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <i className="fa-solid fa-check-circle text-green-600"></i>
                    <div>
                        <p className="font-bold text-green-900">Active Structure: {activeStructure.name}</p>
                        <p className="text-sm text-green-700">v{activeStructure.version} • {activeStructure.sections.length} sections</p>
                    </div>
                </div>
            ) : (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                    <i className="fa-solid fa-exclamation-triangle text-yellow-600"></i>
                    <div>
                        <p className="font-bold text-yellow-900">No Active Structure</p>
                        <p className="text-sm text-yellow-700">Please create and activate a standard structure first</p>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <i className="fa-solid fa-exclamation-circle text-red-600 mt-0.5"></i>
                    <div className="flex-1">
                        <p className="font-bold text-red-900">Error</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
            )}

            {/* Success Message Display */}
            {successMessage && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <i className="fa-solid fa-check-circle text-green-600 mt-0.5"></i>
                    <div className="flex-1">
                        <p className="text-sm text-green-800 font-medium">{successMessage}</p>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
            )}

            {/* Upload Section - Always Visible */}
            <div className="mb-8 bg-gradient-to-br from-indigo-50 to-white rounded-xl border-2 border-indigo-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Upload Manual</h2>
                    {documents.length > 0 && (
                        <span className="text-xs text-indigo-600 font-medium bg-indigo-100 px-3 py-1 rounded-full">
                            💡 You can upload multiple files
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Beamline</label>
                        <select
                            value={beamlineId}
                            onChange={(e) => setBeamlineId(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            {beamlines.map(bl => (
                                <option key={bl} value={bl}>{bl}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Vendor</label>
                        <select
                            value={vendor}
                            onChange={(e) => setVendor(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="JASRI">JASRI</option>
                            <option value="Nichigi">日技</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Manual File (PDF/DOCX)</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileSelect}
                        onClick={handleFileInputClick}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    {selectedFile && (
                        <p className="text-sm text-slate-600 mt-2">Selected: {selectedFile.name}</p>
                    )}
                </div>
                <button
                    onClick={uploadFile}
                    disabled={isUploading || !selectedFile || !beamlineId}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                    {isUploading ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-upload"></i>
                            Upload File
                        </>
                    )}
                </button>
            </div>

            {/* Documents List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">Uploaded Documents</h2>
                            {documents.some(d => d.status === 'uploaded') && (
                                <button
                                    onClick={analyzeBatch}
                                    disabled={isAnalyzingBatch || selectedDocs.size === 0}
                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-bold hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    {isAnalyzingBatch ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-play-circle"></i>
                                            Analyze Selected ({selectedDocs.size})
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                    </div>
                    {documents.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                            <i className="fa-solid fa-file-upload text-4xl text-slate-300 mb-3"></i>
                            <p className="text-slate-500">No documents uploaded yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map(doc => (
                                <div
                                    key={doc.documentId}
                                    className={`bg-white rounded-lg border-2 p-4 transition-all ${selectedDocIds.includes(doc.documentId)
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3 mb-2">
                                        {doc.status === 'uploaded' && (
                                            <div className="flex items-center justify-center pt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDocs.has(doc.documentId)}
                                                    onChange={() => toggleDocSelection(doc.documentId)}
                                                    className="w-5 h-5 text-green-600 border-2 border-slate-400 rounded focus:ring-2 focus:ring-green-500 cursor-pointer hover:border-green-500 transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Select for batch analysis"
                                                />
                                            </div>
                                        )}
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => doc.status === 'complete' && loadReport(doc.documentId)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-800">{doc.filename}</h3>
                                                    <p className="text-sm text-slate-600">{doc.beamlineId}</p>
                                                </div>
                                                <div className="flex items-center gap-2">

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteDocument(doc.documentId);
                                                        }}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <i className="fa-solid fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            {doc.status === 'uploaded' && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                                    Ready to Analyze
                                                </span>
                                            )}
                                            {doc.status === 'analyzing' && (
                                                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                                                    <i className="fa-solid fa-robot text-indigo-600"></i>
                                                    <span>AI is analyzing the document against the standard structure...</span>
                                                </div>
                                            )}
                                            {doc.status === 'complete' && (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                    <i className="fa-solid fa-check-circle"></i>
                                                    Complete
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Report Display */}
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Report</h2>
                    {report ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            {/* Coverage Overview */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-slate-800">Overall Coverage</h3>
                                    <span className={`text-3xl font-extrabold ${report.report.coveragePercentage >= 90 ? 'text-green-600' :
                                        report.report.coveragePercentage >= 70 ? 'text-yellow-600' :
                                            'text-red-600'
                                        }`}>
                                        {report.report.coveragePercentage}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all ${report.report.coveragePercentage >= 90 ? 'bg-green-600' :
                                            report.report.coveragePercentage >= 70 ? 'bg-yellow-600' :
                                                'bg-red-600'
                                            }`}
                                        style={{ width: `${report.report.coveragePercentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Category Breakdown */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-3">Coverage by Category</h3>
                                <div className="space-y-2">
                                    {report.report.categoryBreakdown.map((cat: any) => (
                                        <div key={cat.category} className="flex items-center justify-between">
                                            <span className="text-sm text-slate-700">{cat.category}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-600">{cat.found}/{cat.total}</span>
                                                <span className={`text-sm font-bold ${cat.percentage >= 90 ? 'text-green-600' :
                                                    cat.percentage >= 50 ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                    {cat.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Missing Sections */}
                            {report.report.missingSections.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-3">Missing Sections</h3>
                                    <div className="space-y-2">
                                        {report.report.missingSections.map((section: any) => (
                                            <div
                                                key={section.sectionId}
                                                className={`p-3 rounded-lg border ${section.required
                                                    ? 'bg-red-50 border-red-200'
                                                    : 'bg-yellow-50 border-yellow-200'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    {section.required && (
                                                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                                                            REQUIRED
                                                        </span>
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-800">{section.sectionName}</p>
                                                        <p className="text-xs text-slate-600 mt-1">{section.recommendation}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {report.report.recommendations && report.report.recommendations.length > 0 && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h3 className="text-sm font-bold text-blue-900 mb-2">Recommendations</h3>
                                    <ul className="space-y-1">
                                        {report.report.recommendations.map((rec: string, idx: number) => {
                                            // Clean up the recommendation text
                                            const cleanRec = rec
                                                .replace(/^\d+\.\s*/, '') // Remove numbered lists (1. 2. 3.)
                                                .replace(/^[-*•]\s*/, '') // Remove bullet points
                                                .replace(/\*\*/g, '')     // Remove bold markdown **
                                                .replace(/\*/g, '')       // Remove asterisks
                                                .trim();

                                            return cleanRec ? (
                                                <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                                                    <span className="text-blue-600 mt-0.5">•</span>
                                                    <span className="flex-1">{cleanRec}</span>
                                                </li>
                                            ) : null;
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center h-full flex items-center justify-center">
                            <div>
                                <i className="fa-solid fa-chart-pie text-4xl text-slate-300 mb-3"></i>
                                <p className="text-slate-500">Select a completed document to view report</p>
                            </div>
                        </div>
                    )}
                </div>
            </div >

            {/* Q&A Interface (NotebookLM-style) */}
            {
                selectedDocIds.length > 0 && report && (
                    <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <i className="fa-solid fa-comments text-indigo-600"></i>
                                Ask Questions
                            </h2>
                            {isCombinedReport && report.report?.documentMetadata && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                                    <p className="text-xs text-indigo-800">
                                        <strong>Querying {selectedDocIds.length} document{selectedDocIds.length !== 1 ? 's' : ''}</strong>
                                    </p>
                                </div>
                            )}
                            {!isCombinedReport && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                                    <p className="text-xs text-indigo-800">
                                        <strong>Querying document:</strong>{' '}
                                        {documents.find(d => d.documentId === selectedDocIds[0])?.filename || 'Unknown'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Chat History */}
                        {chatHistory.length > 0 && (
                            <div className="mb-4 space-y-4 max-h-96 overflow-y-auto">
                                {chatHistory.map((chat, idx) => (
                                    <div key={idx} className="space-y-2">
                                        {/* Question */}
                                        <div className="flex justify-end">
                                            <div className="bg-indigo-100 text-indigo-900 rounded-lg px-4 py-2 max-w-2xl">
                                                <p className="text-sm font-bold mb-1">You asked:</p>
                                                <p className="text-sm">{chat.question}</p>
                                            </div>
                                        </div>
                                        {/* Answer */}
                                        <div className="flex justify-start">
                                            <div className="bg-slate-100 text-slate-900 rounded-lg px-4 py-3 max-w-2xl">
                                                <p className="text-sm font-bold mb-1 flex items-center gap-2">
                                                    <i className="fa-solid fa-robot text-indigo-600"></i>
                                                    AI Answer:
                                                </p>
                                                <p className="text-sm whitespace-pre-wrap">{formatAnswer(chat.answer)}</p>
                                                {chat.sources && chat.sources.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-slate-300">
                                                        <p className="text-xs text-slate-600 font-bold mb-1">Sources:</p>
                                                        {chat.sources.map((source: any, sidx) => (
                                                            <p key={sidx} className="text-xs text-slate-500 truncate">
                                                                • {source.filename && `[${source.filename}] `}{source.content} (Relevance: {(source.score * 100).toFixed(0)}%)
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Question Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !isAsking && askQuestion()}
                                placeholder="Ask a question about this manual..."
                                disabled={isAsking}
                                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                            />
                            <button
                                onClick={askQuestion}
                                disabled={isAsking || !question.trim()}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {isAsking ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                        Thinking...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-paper-plane"></i>
                                        Ask
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SemanticComparisonDashboard;
