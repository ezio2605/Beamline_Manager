
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  EXPLORER = 'EXPLORER',
  AUDITOR = 'AUDITOR',
  SYNC = 'SYNC',
  STANDARD_STRUCTURE = 'STANDARD_STRUCTURE',
  SEMANTIC_COMPARISON = 'SEMANTIC_COMPARISON'
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
  comparisonCase: 'case1' | 'case2' | 'case3' | 'case4' | 'case5' | null;
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
  case: 'case1' | 'case2' | 'case3' | 'case4' | 'case5';
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

// ============================================
// Semantic Manual Comparison Types
// ============================================

// Standard Structure Types
export interface StandardSection {
  id: string;
  name: string;
  description: string;
  category: string; // e.g., "Safety", "Operations", "Maintenance"
  required: boolean;
  subsections?: StandardSection[];
  keywords?: string[]; // For LLM matching hints
  examples?: string[]; // Example text for N-shot prompting
}

export interface StandardStructure {
  id: string;
  version: string;
  name: string;
  description: string;
  sections: StandardSection[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Semantic Chunking Types
export interface SemanticChunk {
  id: string;
  documentId: string;
  beamlineId: string;
  content: string;
  chunkIndex: number;
  metadata: {
    heading?: string;
    pageNumber?: number;
    previousContext?: string;
    nextContext?: string;
  };
  embedding?: number[];
  createdAt: string;
}

// Classification Types
export interface SectionMatch {
  sectionId: string;
  sectionName: string;
  confidence: number;
  reasoning: string;
}

export interface SectionClassification {
  id: string;
  chunkId: string;
  documentId: string;
  beamlineId: string;
  standardStructureId: string;
  matches: SectionMatch[];
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// Missing Elements Types
export interface MissingSection {
  sectionId: string;
  sectionName: string;
  category: string;
  required: boolean;
  recommendation: string;
}

export interface CategoryCoverage {
  category: string;
  total: number;
  found: number;
  percentage: number;
}

export interface MissingElementsReport {
  id: string;
  documentId: string;
  beamlineId: string;
  standardStructureId: string;
  foundSections: string[];
  missingSections: MissingSection[];
  coveragePercentage: number;
  categoryBreakdown: CategoryCoverage[];
  generatedAt: string;
}

// Vendor Comparison Types
export interface VendorProfile {
  id: string;
  name: string;
  patterns: string[];
  examples: Record<string, string[]>; // sectionId -> example texts
  lastUpdated: string;
}

export interface SemanticDelta {
  sectionId: string;
  sectionName: string;
  vendor1Content: string;
  vendor2Content: string;
  differences: string[];
  semanticSimilarity: number;
  addedInVendor2: string[];
  removedFromVendor1: string[];
  aiSummary: string;
}

export interface VendorComparison {
  id: string;
  document1Id: string;
  document2Id: string;
  vendor1: string;
  vendor2: string;
  beamlineId: string;
  deltas: SemanticDelta[];
  overallSimilarity: number;
  generatedAt: string;
}

// UI State Types
export interface SemanticComparisonState {
  isProcessing: boolean;
  currentDocument: string | null;
  progress: {
    totalChunks: number;
    processedChunks: number;
    currentChunk: string;
  };
  classifications: SectionClassification[];
  missingElementsReport: MissingElementsReport | null;
  error: string | null;
}

export interface StandardStructureState {
  structures: StandardStructure[];
  activeStructure: StandardStructure | null;
  isLoading: boolean;
  error: string | null;
}

