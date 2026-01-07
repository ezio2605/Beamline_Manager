// File Storage Service for JASRI File Management System
import { STORAGE_PATHS } from '../config/storage.config';
import type {
    FileMetadata,
    BeamlineMetadata,
    MasterIndex,
    UploadedFile,
    ComparisonResult,
    ComparisonLog
} from '../types';

export class FileStorageService {

    /**
     * Load master index from storage
     */
    static async loadMasterIndex(): Promise<MasterIndex | null> {
        try {
            const indexPath = STORAGE_PATHS.getMasterIndexPath();
            const response = await fetch(`file:///${indexPath}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Error loading master index:', error);
            return null;
        }
    }

    /**
     * Load beamline metadata
     */
    static async loadBeamlineMetadata(beamlineId: string): Promise<BeamlineMetadata | null> {
        try {
            const metadataPath = STORAGE_PATHS.getMetadataPath(beamlineId);
            const response = await fetch(`file:///${metadataPath}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error(`Error loading metadata for ${beamlineId}:`, error);
            return null;
        }
    }

    /**
     * Save beamline metadata
     */
    static async saveBeamlineMetadata(
        beamlineId: string,
        metadata: BeamlineMetadata
    ): Promise<boolean> {
        try {
            const metadataPath = STORAGE_PATHS.getMetadataPath(beamlineId);

            // In a real implementation, this would use a backend API
            // For now, we'll use localStorage as a fallback
            const key = `beamline_metadata_${beamlineId}`;
            localStorage.setItem(key, JSON.stringify(metadata));

            console.log(`Saved metadata for ${beamlineId}`);
            return true;
        } catch (error) {
            console.error(`Error saving metadata for ${beamlineId}:`, error);
            return false;
        }
    }

    /**
     * Get all JASRI files for a beamline
     */
    static async getJasriFiles(beamlineId: string): Promise<FileMetadata[]> {
        const metadata = await this.loadBeamlineMetadata(beamlineId);
        return metadata?.files || [];
    }

    /**
     * Add a new file to beamline metadata
     */
    static async addFileToMetadata(
        beamlineId: string,
        file: FileMetadata
    ): Promise<boolean> {
        const metadata = await this.loadBeamlineMetadata(beamlineId);
        if (!metadata) return false;

        metadata.files.push(file);
        metadata.statistics.totalOriginal++;

        return await this.saveBeamlineMetadata(beamlineId, metadata);
    }

    /**
     * Update file metadata after comparison
     */
    static async updateFileMetadata(
        beamlineId: string,
        filename: string,
        updates: Partial<FileMetadata>
    ): Promise<boolean> {
        const metadata = await this.loadBeamlineMetadata(beamlineId);
        if (!metadata) return false;

        const fileIndex = metadata.files.findIndex(f => f.filename === filename);
        if (fileIndex === -1) return false;

        metadata.files[fileIndex] = {
            ...metadata.files[fileIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Update statistics based on comparison case
        if (updates.comparisonCase) {
            const caseKey = `${updates.comparisonCase}Count` as keyof typeof metadata.statistics;
            if (typeof metadata.statistics[caseKey] === 'number') {
                (metadata.statistics[caseKey] as number)++;
            }
            metadata.statistics.totalUpdated++;
            metadata.lastComparison = new Date().toISOString();
        }

        return await this.saveBeamlineMetadata(beamlineId, metadata);
    }

    /**
     * Save uploaded Nichi file information
     */
    static async saveUploadedFile(file: UploadedFile): Promise<boolean> {
        try {
            const key = `uploaded_file_${file.id}`;
            localStorage.setItem(key, JSON.stringify(file));
            return true;
        } catch (error) {
            console.error('Error saving uploaded file:', error);
            return false;
        }
    }

    /**
     * Get uploaded file by ID
     */
    static async getUploadedFile(fileId: string): Promise<UploadedFile | null> {
        try {
            const key = `uploaded_file_${fileId}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting uploaded file:', error);
            return null;
        }
    }

    /**
     * Save comparison result
     */
    static async saveComparisonResult(result: ComparisonResult): Promise<boolean> {
        try {
            // Save to localStorage for now
            const key = `comparison_result_${result.id}`;
            localStorage.setItem(key, JSON.stringify(result));

            // Also save to a list of all results
            const allResultsKey = 'all_comparison_results';
            const existingResults = localStorage.getItem(allResultsKey);
            const results: string[] = existingResults ? JSON.parse(existingResults) : [];
            results.push(result.id);
            localStorage.setItem(allResultsKey, JSON.stringify(results));

            return true;
        } catch (error) {
            console.error('Error saving comparison result:', error);
            return false;
        }
    }

    /**
     * Get all comparison results
     */
    static async getAllComparisonResults(): Promise<ComparisonResult[]> {
        try {
            const allResultsKey = 'all_comparison_results';
            const resultIds = localStorage.getItem(allResultsKey);
            if (!resultIds) return [];

            const ids: string[] = JSON.parse(resultIds);
            const results: ComparisonResult[] = [];

            for (const id of ids) {
                const key = `comparison_result_${id}`;
                const data = localStorage.getItem(key);
                if (data) {
                    results.push(JSON.parse(data));
                }
            }

            return results;
        } catch (error) {
            console.error('Error getting comparison results:', error);
            return [];
        }
    }

    /**
     * Save comparison log
     */
    static async saveComparisonLog(log: ComparisonLog): Promise<boolean> {
        try {
            const key = `comparison_log_${log.id}`;
            localStorage.setItem(key, JSON.stringify(log));

            // Also save to a list of all logs
            const allLogsKey = 'all_comparison_logs';
            const existingLogs = localStorage.getItem(allLogsKey);
            const logs: string[] = existingLogs ? JSON.parse(existingLogs) : [];
            logs.push(log.id);
            localStorage.setItem(allLogsKey, JSON.stringify(logs));

            return true;
        } catch (error) {
            console.error('Error saving comparison log:', error);
            return false;
        }
    }

    /**
     * Get beamline statistics
     */
    static async getBeamlineStatistics(beamlineId: string) {
        const metadata = await this.loadBeamlineMetadata(beamlineId);
        return metadata?.statistics || {
            totalOriginal: 0,
            totalUpdated: 0,
            case1Count: 0,
            case2Count: 0,
            case3Count: 0,
        };
    }

    /**
     * Clear all comparison data (for testing/reset)
     */
    static clearAllData(): void {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (
                key.startsWith('beamline_metadata_') ||
                key.startsWith('uploaded_file_') ||
                key.startsWith('comparison_result_') ||
                key.startsWith('comparison_log_') ||
                key === 'all_comparison_results' ||
                key === 'all_comparison_logs'
            ) {
                localStorage.removeItem(key);
            }
        });
        console.log('All comparison data cleared');
    }
}
