import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { StandardStructure, StandardSection } from '../types';

const API_BASE = '/api';

const StandardStructureManager: React.FC = () => {
    const [structures, setStructures] = useState<StandardStructure[]>([]);
    const [activeStructure, setActiveStructure] = useState<StandardStructure | null>(null);
    const [selectedStructure, setSelectedStructure] = useState<StandardStructure | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importJson, setImportJson] = useState('');

    useEffect(() => {
        loadStructures();
    }, []);

    const loadStructures = async () => {
        try {
            setIsLoading(true);
            const [allRes, activeRes] = await Promise.all([
                axios.get(`${API_BASE}/standard-structure/all`),
                axios.get(`${API_BASE}/standard-structure`).catch(() => ({ data: { data: null } }))
            ]);

            setStructures(allRes.data.data || []);
            setActiveStructure(activeRes.data.data);
            setError(null);
        } catch (err) {
            setError('Failed to load structures');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const createDefaultStructure = async () => {
        try {
            await axios.post(`${API_BASE}/standard-structure/default`);
            await loadStructures();
        } catch (err) {
            setError('Failed to create default structure');
            console.error(err);
        }
    };

    const activateStructure = async (id: string) => {
        try {
            await axios.post(`${API_BASE}/standard-structure/${id}/activate`);
            await loadStructures();
        } catch (err) {
            setError('Failed to activate structure');
            console.error(err);
        }
    };

    const deleteStructure = async (id: string) => {
        if (!confirm('Are you sure you want to delete this structure?')) return;

        try {
            await axios.delete(`${API_BASE}/standard-structure/${id}`);
            await loadStructures();
            if (selectedStructure?.id === id) {
                setSelectedStructure(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete structure');
            console.error(err);
        }
    };

    const exportStructure = async (id: string) => {
        try {
            const response = await axios.get(`${API_BASE}/standard-structure/${id}/export`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `standard-structure-${id}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError('Failed to export structure');
            console.error(err);
        }
    };

    const importStructure = async () => {
        try {
            await axios.post(`${API_BASE}/standard-structure/import`, {
                jsonData: importJson
            });
            await loadStructures();
            setShowImportDialog(false);
            setImportJson('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to import structure');
            console.error(err);
        }
    };

    const renderSection = (section: StandardSection, level: number = 0) => {
        const indent = level * 24;

        return (
            <div key={section.id} style={{ marginLeft: `${indent}px` }} className="mb-3">
                <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-bold text-slate-800">{section.name}</h4>
                                {section.required && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                        REQUIRED
                                    </span>
                                )}
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                    {section.category}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{section.description}</p>
                            {section.keywords && section.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {section.keywords.map((keyword, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded">
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {section.examples && section.examples.length > 0 && (
                                <details className="mt-2">
                                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                                        {section.examples.length} example(s)
                                    </summary>
                                    <div className="mt-2 space-y-1">
                                        {section.examples.map((example, idx) => (
                                            <p key={idx} className="text-xs text-slate-600 italic pl-4 border-l-2 border-slate-200">
                                                "{example}"
                                            </p>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
                {section.subsections && section.subsections.length > 0 && (
                    <div className="mt-2">
                        {section.subsections.map(subsection => renderSection(subsection, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <i className="fa-solid fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
                    <p className="text-slate-600">Loading structures...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Standard Structure Manager</h1>
                <p className="text-slate-600">Manage and configure standard manual structures for semantic comparison</p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <i className="fa-solid fa-exclamation-circle text-red-600 mt-0.5"></i>
                    <div>
                        <p className="font-bold text-red-900">Error</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
            )}

            {/* Action Bar */}
            <div className="mb-6 flex gap-3">
                <button
                    onClick={createDefaultStructure}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus"></i>
                    Create Default Structure
                </button>
                <button
                    onClick={() => setShowImportDialog(true)}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                    <i className="fa-solid fa-file-import"></i>
                    Import JSON
                </button>
                <button
                    onClick={loadStructures}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                    <i className="fa-solid fa-refresh"></i>
                    Refresh
                </button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Structure List */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Structures</h2>
                        {structures.length === 0 ? (
                            <div className="text-center py-8">
                                <i className="fa-solid fa-folder-open text-4xl text-slate-300 mb-3"></i>
                                <p className="text-slate-500">No structures found</p>
                                <p className="text-sm text-slate-400 mt-1">Create a default structure to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {structures.map(structure => (
                                    <div
                                        key={structure.id}
                                        onClick={() => setSelectedStructure(structure)}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedStructure?.id === structure.id
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-800">{structure.name}</h3>
                                                <p className="text-xs text-slate-500">v{structure.version}</p>
                                            </div>
                                            {structure.isActive && (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mb-3">{structure.description}</p>
                                        <div className="flex gap-2">
                                            {!structure.isActive && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        activateStructure(structure.id);
                                                    }}
                                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                                >
                                                    Activate
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    exportStructure(structure.id);
                                                }}
                                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                            >
                                                Export
                                            </button>
                                            {!structure.isActive && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteStructure(structure.id);
                                                    }}
                                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Structure Details */}
                <div className="lg:col-span-2">
                    {selectedStructure ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedStructure.name}</h2>
                                <p className="text-slate-600 mb-2">{selectedStructure.description}</p>
                                <div className="flex gap-2 text-sm">
                                    <span className="text-slate-500">Version: {selectedStructure.version}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500">{selectedStructure.sections.length} sections</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Sections</h3>
                                {selectedStructure.sections.map(section => renderSection(section))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 h-full flex items-center justify-center">
                            <div className="text-center">
                                <i className="fa-solid fa-hand-pointer text-4xl text-slate-300 mb-3"></i>
                                <p className="text-slate-500">Select a structure to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Import Dialog */}
            {showImportDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Import Structure from JSON</h2>
                        <textarea
                            value={importJson}
                            onChange={(e) => setImportJson(e.target.value)}
                            placeholder="Paste JSON structure here..."
                            className="w-full h-64 p-4 border border-slate-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={importStructure}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                            >
                                Import
                            </button>
                            <button
                                onClick={() => {
                                    setShowImportDialog(false);
                                    setImportJson('');
                                }}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StandardStructureManager;
