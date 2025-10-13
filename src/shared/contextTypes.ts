export interface ContextTaskSummary {
  id: number;
  title: string;
  lifecycleStatus?: string;
  status?: string;
  userStory?: string;
  acceptanceCriteria?: string[];
  impactScore?: number;
  priorityScore?: number;
  riskScore?: number;
  complexityScore?: number;
  placeholderAdded?: boolean;
  hasCodeRefs?: boolean;
  files?: ContextFileRef[];
}

export interface ContextFileRef {
  path: string;
  occurrences: number;
}

export interface ContextBundleMeta {
  generatedAt: string;
  source: string;
  taskCount: number;
}

export interface ContextBundle {
  meta: ContextBundleMeta;
  tasks: ContextTaskSummary[];
  relatedFiles: string[];
  stats: {
    tasksWithRefs: number;
    tasksWithoutRefs: number;
  };
}
