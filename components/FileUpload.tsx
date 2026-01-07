// Enhanced File Upload Component for Nichi Files
import React, { useState } from 'react';
import type { UploadedFile, FileUploadState } from '../types';
import { STORAGE_PATHS, SUPPORTED_FILE_TYPES } from '../config/storage.config';

interface FileUploadProps {
    selectedBeamline: string;
    onFilesUploaded: (files: UploadedFile[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ selectedBeamline, onFilesUploaded }) => {
    const [uploadState, setUploadState] = useState<FileUploadState>({
        isUploading: false,
        uploadProgress: 0,
        selectedBeamline: selectedBeamline,
        files: [],
        error: null
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        // Validate file types
        const invalidFiles = files.filter((file: File) => {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            return !SUPPORTED_FILE_TYPES.NICHI.includes(ext);
        });

        if (invalidFiles.length > 0) {
            setUploadState(prev => ({
                ...prev,
                error: `Unsupported file types: ${invalidFiles.map((f: File) => f.name).join(', ')}`
            }));
            return;
        }

        setUploadState(prev => ({
            ...prev,
            files,
            error: null
        }));
    };

    const handleUpload = async () => {
        if (uploadState.files.length === 0) return;

        setUploadState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

        try {
            const uploadedFiles: UploadedFile[] = [];

            for (let i = 0; i < uploadState.files.length; i++) {
                const file = uploadState.files[i];

                // Simulate file upload (in real implementation, this would upload to server)
                const uploadedFile: UploadedFile = {
                    id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    filename: file.name,
                    filepath: `${STORAGE_PATHS.getNichiPendingPath()}\\${file.name}`,
                    fileSize: file.size,
                    fileType: file.type || 'application/octet-stream',
                    uploadedAt: new Date().toISOString(),
                    beamlineId: selectedBeamline,
                    status: 'pending'
                };

                uploadedFiles.push(uploadedFile);

                // Update progress
                const progress = ((i + 1) / uploadState.files.length) * 100;
                setUploadState(prev => ({ ...prev, uploadProgress: progress }));
            }

            onFilesUploaded(uploadedFiles);

            // Reset state
            setUploadState({
                isUploading: false,
                uploadProgress: 0,
                selectedBeamline,
                files: [],
                error: null
            });

        } catch (error) {
            setUploadState(prev => ({
                ...prev,
                isUploading: false,
                error: `Upload failed: ${error}`
            }));
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-cloud-arrow-up text-indigo-600"></i>
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Upload Nichi Files</h3>
                    <p className="text-xs text-slate-500">Beamline: {selectedBeamline}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-indigo-300 transition-colors">
                    <input
                        type="file"
                        id="nichi-file-upload"
                        multiple
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <label
                        htmlFor="nichi-file-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                    >
                        <i className="fa-solid fa-file-arrow-up text-3xl text-slate-300"></i>
                        <span className="text-sm font-medium text-slate-600">
                            Click to select files or drag and drop
                        </span>
                        <span className="text-xs text-slate-400">
                            Supported: PDF, DOCX, DOC
                        </span>
                    </label>
                </div>

                {uploadState.files.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Selected Files</h4>
                        {uploadState.files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-file text-indigo-500"></i>
                                    <span className="text-sm text-slate-700">{file.name}</span>
                                </div>
                                <span className="text-xs text-slate-400">
                                    {(file.size / 1024).toFixed(1)} KB
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {uploadState.isUploading && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-600">
                            <span>Uploading...</span>
                            <span>{uploadState.uploadProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadState.uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {uploadState.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <i className="fa-solid fa-exclamation-circle text-red-500 mt-0.5"></i>
                        <span className="text-sm text-red-700">{uploadState.error}</span>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={uploadState.files.length === 0 || uploadState.isUploading}
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${uploadState.files.length === 0 || uploadState.isUploading
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                        }`}
                >
                    {uploadState.isUploading ? (
                        <>
                            <i className="fa-solid fa-spinner animate-spin mr-2"></i>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-upload mr-2"></i>
                            Upload {uploadState.files.length} File{uploadState.files.length !== 1 ? 's' : ''}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
