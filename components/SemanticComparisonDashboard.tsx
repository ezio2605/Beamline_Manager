import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { MissingElementsReport, StandardStructure } from '../types';

const API_BASE = '/api';

interface UploadedDocument {
    documentId: string;
    filename: string;
    beamlineId: string;
    totalChunks: number;
    processedChunks: number;
    isComplete: boolean;
    progress: number;
}

const SemanticComparisonDashboard: React.FC = () => {
    const [activeStructure, setActiveStructure] = useState<StandardStructure | null>(null);
    const [documents, setDocuments] = useState<UploadedDocument[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [beamlineId, setBeamlineId] = useState('BL01');
    const [vendor, setVendor] = useState('JASRI');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [report, setReport] = useState<any | null>(null);

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

    useEffect(() => {
        // Poll for document status
        const interval = setInterval(() => {
            documents.forEach(doc => {
                if (!doc.isComplete) {
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
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const uploadDocument = async () => {
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
                processedChunks: 0,
                isComplete: false,
                progress: 0
            };

            setDocuments(prev => [...prev, newDoc]);
            setSelectedFile(null);
            setBeamlineId('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to upload document');
        } finally {
            setIsUploading(false);
        }
    };

    const checkDocumentStatus = async (documentId: string) => {
        try {
            const res = await axios.get(`${API_BASE}/semantic-comparison/${documentId}/status`);
            const status = res.data.data;

            setDocuments(prev => prev.map(doc =>
                doc.documentId === documentId
                    ? {
                        ...doc,
                        processedChunks: status.processedChunks,
                        isComplete: status.isComplete,
                        progress: status.progress
                    }
                    : doc
            ));
        } catch (err) {
            console.error('Failed to check status:', err);
        }
    };

    const loadReport = async (documentId: string) => {
        try {
            const res = await axios.get(`${API_BASE}/semantic-comparison/${documentId}/missing-elements`);
            setReport(res.data.data);
            setSelectedDocId(documentId);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load report');
        }
    };

    const deleteDocument = async (documentId: string) => {
        if (!confirm('Delete this document and all its data?')) return;

        try {
            await axios.delete(`${API_BASE}/semantic-comparison/${documentId}`);
            setDocuments(prev => prev.filter(doc => doc.documentId !== documentId));
            if (selectedDocId === documentId) {
                setSelectedDocId(null);
                setReport(null);
            }
        } catch (err) {
            setError('Failed to delete document');
        }
    };

    return (
        <div className="p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Semantic Manual Comparison</h1>
                <p className="text-slate-600">Upload and analyze beamline manuals against standard structure</p>
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

            {/* Upload Section */}
            <div className="mb-8 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Upload Manual</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Beamline</label>
                        <select
                            value={beamlineId}
                            onChange={(e) => setBeamlineId(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="JASRI">JASRI</option>
                            <option value="Nichigi">Nichigi (日技)</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Manual File (PDF/DOCX)</label>
                    <input
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileSelect}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {selectedFile && (
                        <p className="text-sm text-slate-600 mt-2">Selected: {selectedFile.name}</p>
                    )}
                </div>
                <button
                    onClick={uploadDocument}
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
                            Upload and Analyze
                        </>
                    )}
                </button>
            </div>

            {/* Documents List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Uploaded Documents</h2>
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
                                    onClick={() => doc.isComplete && loadReport(doc.documentId)}
                                    className={`bg-white rounded-lg border-2 p-4 transition-all ${selectedDocId === doc.documentId
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800">{doc.filename}</h3>
                                            <p className="text-sm text-slate-600">{doc.beamlineId}</p>
                                        </div>
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

                                    {!doc.isComplete ? (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-solid fa-spinner fa-spin text-indigo-600"></i>
                                                <span className="text-sm text-slate-600">Processing... {doc.progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${doc.progress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {doc.processedChunks} / {doc.totalChunks} chunks processed
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <i className="fa-solid fa-check-circle"></i>
                                            <span className="text-sm font-bold">Analysis Complete</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Report Display */}
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Missing Elements Report</h2>
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
                            {report.recommendations && report.recommendations.length > 0 && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h3 className="text-sm font-bold text-blue-900 mb-2">Recommendations</h3>
                                    <ul className="space-y-1">
                                        {report.recommendations.map((rec: string, idx: number) => (
                                            <li key={idx} className="text-sm text-blue-800">{rec}</li>
                                        ))}
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
            </div>
        </div>
    );
};

export default SemanticComparisonDashboard;
