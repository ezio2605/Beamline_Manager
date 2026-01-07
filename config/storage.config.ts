// Storage Configuration for JASRI File Management System

export const STORAGE_PATHS = {
  // Base directories
  JASRI_BASE: 'd:\\Spring8\\System\\Operation Manual_AG\\JASRI_Knowledge_Base',
  NICHI_UPLOADS: 'd:\\Spring8\\System\\Operation Manual_AG\\Nichi_Uploads',
  COMPARISON_RESULTS: 'd:\\Spring8\\System\\Operation Manual_AG\\Comparison_Results',
  
  // Helper functions to get specific paths
  getBeamlinePath: (beamlineId: string): string => 
    `d:\\Spring8\\System\\Operation Manual_AG\\JASRI_Knowledge_Base\\${beamlineId}`,
  
  getOriginalPath: (beamlineId: string): string => 
    `d:\\Spring8\\System\\Operation Manual_AG\\JASRI_Knowledge_Base\\${beamlineId}\\original`,
  
  getUpdatedPath: (beamlineId: string): string => 
    `d:\\Spring8\\System\\Operation Manual_AG\\JASRI_Knowledge_Base\\${beamlineId}\\updated`,
  
  getMetadataPath: (beamlineId: string): string => 
    `d:\\Spring8\\System\\Operation Manual_AG\\JASRI_Knowledge_Base\\${beamlineId}\\metadata.json`,
  
  getMasterIndexPath: (): string => 
    'd:\\Spring8\\System\\Operation Manual_AG\\JASRI_Knowledge_Base\\index.json',
  
  // Nichi upload paths
  getNichiPendingPath: (): string => 
    'd:\\Spring8\\System\\Operation Manual_AG\\Nichi_Uploads\\pending',
  
  getNichiProcessedPath: (): string => 
    'd:\\Spring8\\System\\Operation Manual_AG\\Nichi_Uploads\\processed',
  
  // Comparison result paths
  getCase1Path: (): string => 
    'd:\\Spring8\\System\\Operation Manual_AG\\Comparison_Results\\case1_updates',
  
  getCase2Path: (): string => 
    'd:\\Spring8\\System\\Operation Manual_AG\\Comparison_Results\\case2_matches',
  
  getCase3Path: (): string => 
    'd:\\Spring8\\System\\Operation Manual_AG\\Comparison_Results\\case3_new',
  
  getLogsPath: (): string => 
    'd:\\Spring8\\System\\Operation Manual_AG\\Comparison_Results\\logs',
};

// File size limits (in bytes)
export const FILE_LIMITS = {
  MAX_UPLOAD_SIZE: 100 * 1024 * 1024, // 100MB per file
  MAX_TOTAL_SIZE: 5 * 1024 * 1024 * 1024, // 5GB total
};

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  JASRI: ['.pdf', '.docx', '.doc'],
  NICHI: ['.pdf', '.docx', '.doc'],
};

// Comparison cases
export const COMPARISON_CASES = {
  CASE1: 'case1', // Update: Nichi has more detail
  CASE2: 'case2', // Match: Same content
  CASE3: 'case3', // New: Nichi has new content
} as const;

export type ComparisonCase = typeof COMPARISON_CASES[keyof typeof COMPARISON_CASES];
