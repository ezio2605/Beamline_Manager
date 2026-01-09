// GitHub-style Diff Viewer Component
import React, { useMemo } from 'react';
import * as Diff from 'diff';

interface DiffViewerProps {
    jasriContent: string;
    nichiContent: string;
    comparisonCase: 'case1' | 'case2' | 'case3';
}

type DiffLine = {
    type: 'added' | 'removed' | 'unchanged' | 'modified';
    content: string;
    lineNumber: number;
    jasriLineNumber?: number;
    nichiLineNumber?: number;
};

const DiffViewer: React.FC<DiffViewerProps> = ({ jasriContent, nichiContent, comparisonCase }) => {
    // Check if JASRI file exists
    const hasJasriFile = jasriContent && jasriContent !== 'No JASRI file found';

    console.log('DiffViewer received:', {
        comparisonCase,
        hasJasriFile,
        jasriContentLength: jasriContent?.length || 0,
        nichiContentLength: nichiContent?.length || 0,
        jasriPreview: jasriContent?.substring(0, 100) || 'empty',
        nichiPreview: nichiContent?.substring(0, 100) || 'empty'
    });

    const diffLines = useMemo(() => {
        // If no JASRI file, treat as empty content for diff
        const jasriText = hasJasriFile ? jasriContent : '';

        console.log('Calculating diff with jasriText length:', jasriText.length, 'nichiContent length:', nichiContent.length);

        // Generate diff
        const diff = Diff.diffLines(jasriText, nichiContent);

        const result: { jasri: DiffLine[]; nichi: DiffLine[] } = {
            jasri: [],
            nichi: [],
        };

        let jasriLineNum = 1;
        let nichiLineNum = 1;

        diff.forEach((part) => {
            const lines = part.value.split('\n');
            // Remove last empty line if exists
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }

            lines.forEach((line) => {
                if (part.added) {
                    // Line only in Nichi (addition)
                    result.nichi.push({
                        type: 'added',
                        content: line,
                        lineNumber: nichiLineNum++,
                        nichiLineNumber: nichiLineNum - 1,
                    });
                    // Add placeholder in JASRI view
                    result.jasri.push({
                        type: 'removed',
                        content: '',
                        lineNumber: jasriLineNum,
                    });
                } else if (part.removed) {
                    // Line only in JASRI (removal)
                    result.jasri.push({
                        type: 'removed',
                        content: line,
                        lineNumber: jasriLineNum++,
                        jasriLineNumber: jasriLineNum - 1,
                    });
                    // Add placeholder in Nichi view
                    result.nichi.push({
                        type: 'added',
                        content: '',
                        lineNumber: nichiLineNum,
                    });
                } else {
                    // Unchanged line
                    result.jasri.push({
                        type: 'unchanged',
                        content: line,
                        lineNumber: jasriLineNum++,
                        jasriLineNumber: jasriLineNum - 1,
                    });
                    result.nichi.push({
                        type: 'unchanged',
                        content: line,
                        lineNumber: nichiLineNum++,
                        nichiLineNumber: nichiLineNum - 1,
                    });
                }
            });
        });

        return result;
    }, [jasriContent, nichiContent, hasJasriFile]);

    const getLineStyle = (type: DiffLine['type'], isJasri: boolean) => {
        switch (type) {
            case 'added':
                return isJasri
                    ? 'bg-red-50 border-l-4 border-red-400' // Removed from JASRI perspective
                    : 'bg-green-50 border-l-4 border-green-400'; // Added in Nichi
            case 'removed':
                return isJasri
                    ? 'bg-red-50 border-l-4 border-red-400' // Removed in JASRI
                    : 'bg-green-50 border-l-4 border-green-400'; // Added from Nichi perspective
            case 'unchanged':
                return 'bg-white border-l-4 border-transparent';
            default:
                return 'bg-white border-l-4 border-transparent';
        }
    };

    const getLineIcon = (type: DiffLine['type'], isJasri: boolean) => {
        if (type === 'added') {
            return isJasri ? '' : '+';
        }
        if (type === 'removed') {
            return isJasri ? '-' : '';
        }
        return ' ';
    };

    return (
        <div className="grid grid-cols-2 gap-6">
            {/* JASRI Content */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <i className="fa-solid fa-file-lines"></i>
                    JASRI Content
                    {!hasJasriFile && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded normal-case">
                            No file
                        </span>
                    )}
                </h4>
                <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden">
                    <div className="h-96 overflow-auto">
                        {!hasJasriFile ? (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                <div className="text-center">
                                    <i className="fa-solid fa-file-circle-xmark text-4xl mb-2"></i>
                                    <p>No JASRI file found</p>
                                    <p className="text-xs mt-1">All Nichi content is new</p>
                                </div>
                            </div>
                        ) : (
                            <div className="font-mono text-xs leading-relaxed">
                                {diffLines.jasri.map((line, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${getLineStyle(line.type, true)} transition-colors`}
                                    >
                                        <span className="w-12 flex-shrink-0 text-slate-400 text-right pr-2 select-none bg-slate-100 border-r border-slate-200">
                                            {line.jasriLineNumber || ''}
                                        </span>
                                        <span className="w-6 flex-shrink-0 text-center text-slate-500 select-none font-bold">
                                            {getLineIcon(line.type, true)}
                                        </span>
                                        <span className="flex-1 px-3 py-1 text-slate-700 whitespace-pre-wrap break-words">
                                            {line.content || '\u00A0'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Nichi Content */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <i className="fa-solid fa-file-lines"></i>
                    日技 Content
                    <span
                        className={`text-[10px] px-2 py-0.5 rounded normal-case font-bold ${comparisonCase === 'case1'
                            ? 'bg-amber-100 text-amber-700'
                            : comparisonCase === 'case2'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                    >
                        {comparisonCase === 'case1' ? 'UPDATE' : comparisonCase === 'case2' ? 'MATCH' : 'NEW'}
                    </span>
                </h4>
                <div className="bg-white rounded-2xl border-2 border-indigo-200 overflow-hidden shadow-sm">
                    <div className="h-96 overflow-auto">
                        <div className="font-mono text-xs leading-relaxed">
                            {diffLines.nichi.map((line, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${getLineStyle(line.type, false)} transition-colors`}
                                >
                                    <span className="w-12 flex-shrink-0 text-slate-400 text-right pr-2 select-none bg-slate-100 border-r border-slate-200">
                                        {line.nichiLineNumber || ''}
                                    </span>
                                    <span className="w-6 flex-shrink-0 text-center text-slate-500 select-none font-bold">
                                        {getLineIcon(line.type, false)}
                                    </span>
                                    <span className="flex-1 px-3 py-1 text-slate-700 whitespace-pre-wrap break-words">
                                        {line.content || '\u00A0'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiffViewer;
