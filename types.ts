
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  EXPLORER = 'EXPLORER',
  AUDITOR = 'AUDITOR',
  SYNC = 'SYNC'
}

export interface BeamlineNode {
  name: string;
  children?: BeamlineNode[];
  type?: 'beamline' | 'system' | 'procedure' | 'file';
  fileUrl?: string;
  description?: string;
}

export interface AuditItem {
  id: string;
  category: string;
  status: 'complete' | 'partial' | 'missing';
  comment?: string;
}

export interface BeamlineAudit {
  id: string;
  name: string;
  items: AuditItem[];
}

export interface SyncComparison {
  id: string;
  beamline: string;
  jasriContent: string;
  nichigagiContent: string;
  diff: string;
  status: 'new' | 'update' | 'match' | 'idle';
  proposedChange: string;
  insights?: string;
}

export interface ServerStorage {
  [beamlineId: string]: string;
}

// ============================================
// File Management Types
// ============================================

export interface FileMetadata {
  filename: string;
  originalPath: string;
  currentVersion: string;
  lastCompared: string | null;
  comparisonCase: 'case1' | 'case2' | 'case3' | null;
  nichiSource: string | null;
  fileSize: number;
  fileType: string;
  createdAt: string;
  updatedAt: string;
}

export interface BeamlineMetadata {
  beamline: string;
  created: string;
  files: FileMetadata[];
  statistics: {
    totalOriginal: number;
    totalUpdated: number;
    case1Count: number;
    case2Count: number;
    case3Count: number;
  };
  lastComparison: string | null;
}

export interface MasterIndex {
  version: string;
  created: string;
  beamlines: BeamlineInfo[];
  totalFiles: number;
  lastUpdated: string;
}

export interface BeamlineInfo {
  id: string;
  name: string;
  path: string;
  status: 'active' | 'inactive';
}

// ============================================
// File Upload and Comparison Types
// ============================================

export interface UploadedFile {
  id: string;
  filename: string;
  filepath: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  beamlineId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface ComparisonResult {
  id: string;
  jasriFile: FileMetadata | null;
  nichiFile: UploadedFile;
  beamlineId: string;
  case: 'case1' | 'case2' | 'case3';
  timestamp: string;
  jasriContent: string;
  nichiContent: string;
  differences: string;
  aiInsights: string;
  actionTaken: string;
  resultPath: string;
}

export interface ComparisonLog {
  id: string;
  timestamp: string;
  beamlineId: string;
  filesCompared: number;
  case1Count: number;
  case2Count: number;
  case3Count: number;
  results: ComparisonResult[];
  duration: number;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

// ============================================
// UI State Types
// ============================================

export interface FileUploadState {
  isUploading: boolean;
  uploadProgress: number;
  selectedBeamline: string | null;
  files: File[];
  error: string | null;
}

export interface ComparisonState {
  isComparing: boolean;
  currentFile: string | null;
  progress: number;
  results: ComparisonResult[];
  error: string | null;
}

// ============================================
// RAG-Related Types
// ============================================

export interface RAGSimilarityResult {
  filename: string;
  content: string;
  score: number;
  rank: number;
  metadata: {
    beamlineId: string;
    source: 'jasri' | 'nichi';
    chunkIndex: number;
  };
}

export interface RAGComparisonContext {
  nichiContent: string;
  retrievedJasriDocs: RAGSimilarityResult[];
  topMatchScore: number;
  retrievalTimestamp: string;
}

export interface VectorStoreStatus {
  isInitialized: boolean;
  documentCount: number;
  lastIndexed: string | null;
  beamlinesIndexed: string[];
}

export interface IndexingProgress {
  current: number;
  total: number;
  currentFile: string;
  status: 'indexing' | 'completed' | 'error';
  error?: string;
}
