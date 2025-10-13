import {
  AgentContext,
  Task,
  TaskResult,
  LearningEvent,
  PerformanceMetric,
  AIProvider
} from './types';
import { AgentContextManager, IsolatedAgentContext } from './AgentContextManager';
import { AIService } from './AIService';
import * as monaco from 'monaco-editor';

/**
 * Context source types for intelligent gathering
 */
export enum ContextSource {
  PROJECT_STRUCTURE = 'project_structure',
  FILE_RELATIONSHIPS = 'file_relationships',
  USER_BEHAVIOR = 'user_behavior',
  CODE_PATTERNS = 'code_patterns',
  DEPENDENCY_ANALYSIS = 'dependency_analysis',
  HISTORICAL_CONTEXT = 'historical_context',
  SEMANTIC_CONTEXT = 'semantic_context',
  PERFORMANCE_CONTEXT = 'performance_context'
}

/**
 * Context quality metrics
 */
export interface ContextQuality {
  completeness: number; // 0-1
  relevance: number; // 0-1
  freshness: number; // 0-1
  accuracy: number; // 0-1
  overall: number; // 0-1
}

/**
 * Context metadata for tracking and optimization
 */
export interface ContextMetadata {
  source: ContextSource;
  timestamp: number;
  confidence: number;
  accessCount: number;
  lastAccessed: number;
  dependencies: string[];
  tags: string[];
  quality: ContextQuality;
}

/**
 * Intelligent context entry with metadata
 */
export interface ContextEntry {
  id: string;
  type: string;
  content: any;
  metadata: ContextMetadata;
  relationships: string[];
  embeddings?: number[];
}

/**
 * Context query for intelligent retrieval
 */
export interface ContextQuery {
  query: string;
  types?: string[];
  sources?: ContextSource[];
  maxResults?: number;
  minQuality?: number;
  includeRelationships?: boolean;
  semanticSearch?: boolean;
}

/**
 * Context relationship types
 */
export enum ContextRelationship {
  DEPENDS_ON = 'depends_on',
  RELATED_TO = 'related_to',
  IMPLEMENTS = 'implements',
  EXTENDS = 'extends',
  USES = 'uses',
  CONTAINS = 'contains',
  SIMILAR_TO = 'similar_to'
}

/**
 * Advanced Context Awareness System
 * Intelligently gathers, manages, and provides context from multiple sources
 */
export class ContextAwarenessSystem {
  private contextManager: AgentContextManager;
  private aiService: AIService;
  private contextEntries: Map<string, ContextEntry> = new Map();
  private contextRelationships: Map<string, ContextRelationship[]> = new Map();
  private contextIndex: Map<string, Set<string>> = new Map(); // For fast lookups
  private embeddingCache: Map<string, number[]> = new Map();
  private qualityThresholds: Map<ContextSource, number> = new Map();

  // Performance optimization
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  // Context gathering workers
  private workers: Map<ContextSource, ContextWorker> = new Map();
  private isGathering = false;

  constructor(contextManager: AgentContextManager, aiService: AIService) {
    this.contextManager = contextManager;
    this.aiService = aiService;
    this.initializeWorkers();
    this.initializeQualityThresholds();
  }

  /**
   * Initialize context gathering workers for different sources
   */
  private initializeWorkers(): void {
    this.workers.set(ContextSource.PROJECT_STRUCTURE, new ProjectStructureWorker());
    this.workers.set(ContextSource.FILE_RELATIONSHIPS, new FileRelationshipWorker());
    this.workers.set(ContextSource.USER_BEHAVIOR, new UserBehaviorWorker());
    this.workers.set(ContextSource.CODE_PATTERNS, new CodePatternWorker());
    this.workers.set(ContextSource.DEPENDENCY_ANALYSIS, new DependencyAnalysisWorker());
    this.workers.set(ContextSource.HISTORICAL_CONTEXT, new HistoricalContextWorker());
    this.workers.set(ContextSource.SEMANTIC_CONTEXT, new SemanticContextWorker());
    this.workers.set(ContextSource.PERFORMANCE_CONTEXT, new PerformanceContextWorker());
  }

  /**
   * Initialize quality thresholds for different context sources
   */
  private initializeQualityThresholds(): void {
    this.qualityThresholds.set(ContextSource.PROJECT_STRUCTURE, 0.8);
    this.qualityThresholds.set(ContextSource.FILE_RELATIONSHIPS, 0.7);
    this.qualityThresholds.set(ContextSource.USER_BEHAVIOR, 0.6);
    this.qualityThresholds.set(ContextSource.CODE_PATTERNS, 0.9);
    this.qualityThresholds.set(ContextSource.DEPENDENCY_ANALYSIS, 0.8);
    this.qualityThresholds.set(ContextSource.HISTORICAL_CONTEXT, 0.7);
    this.qualityThresholds.set(ContextSource.SEMANTIC_CONTEXT, 0.9);
    this.qualityThresholds.set(ContextSource.PERFORMANCE_CONTEXT, 0.8);
  }

  /**
   * Gather context from all available sources
   */
  async gatherContext(
    agentId: string,
    options: {
      sources?: ContextSource[];
      forceRefresh?: boolean;
      includeEmbeddings?: boolean;
      maxAge?: number;
    } = {}
  ): Promise<ContextEntry[]> {
    const sources = options.sources || Array.from(this.workers.keys());
    const newEntries: ContextEntry[] = [];

    this.isGathering = true;

    try {
      // Gather context from each source in parallel
      const gatheringPromises = sources.map(async (source) => {
        const worker = this.workers.get(source);
        if (!worker) return [];

        const cacheKey = `context_${agentId}_${source}`;
        const cached = this.getCachedResult(cacheKey, options.maxAge);

        if (cached && !options.forceRefresh) {
          return cached;
        }

        const entries = await worker.gather(agentId, this.contextManager, this.aiService);
        const processedEntries = await this.processEntries(entries, source, options.includeEmbeddings);

        this.setCachedResult(cacheKey, processedEntries);
        return processedEntries;
      });

      const results = await Promise.all(gatheringPromises);
      results.forEach(entries => newEntries.push(...entries));

      // Store entries and build relationships
      await this.storeEntries(newEntries);
      await this.buildRelationships(newEntries);

      return newEntries;
    } finally {
      this.isGathering = false;
    }
  }

  /**
   * Query context with intelligent ranking and filtering
   */
  async queryContext(query: ContextQuery): Promise<{
    entries: ContextEntry[];
    relationships: Map<string, ContextRelationship[]>;
    quality: ContextQuality;
  }> {
    const startTime = Date.now();

    try {
      // Get relevant entries
      let entries = await this.findRelevantEntries(query);

      // Apply quality filtering\r\n      if (query.minQuality !== undefined) {\r\n        const minQuality = query.minQuality;\r\n        entries = entries.filter(entry => {\r\n          const overallQuality = entry.metadata?.quality?.overall ?? 0;\r\n          return overallQuality >= minQuality;\r\n        });\r\n      }

      // Sort by relevance and quality
      entries = this.rankEntries(entries, query);

      // Limit results
      if (query.maxResults) {
        entries = entries.slice(0, query.maxResults);
      }

      // Get relationships for entries
      const relationships = new Map<string, ContextRelationship[]>();
      for (const entry of entries) {
        const entryRelationships = this.contextRelationships.get(entry.id) || [];
        if (query.includeRelationships) {
          relationships.set(entry.id, entryRelationships);
        }
      }

      // Calculate overall quality
      const quality = this.calculateOverallQuality(entries);

      return { entries, relationships, quality };
    } catch (error) {
      console.error('Context query failed:', error);
      return { entries: [], relationships: new Map(), quality: this.createEmptyQuality() };
    }
  }

  /**
   * Get context for a specific file and position
   */
  async getFileContext(
    filePath: string,
    position: monaco.Position,
    options: {
      includeNeighbors?: boolean;
      includeDependencies?: boolean;
      includeHistory?: boolean;
      radius?: number;
    } = {}
  ): Promise<{
    localContext: ContextEntry[];
    relatedContext: ContextEntry[];
    quality: ContextQuality;
  }> {
    const radius = options.radius || 50; // lines
    const localContext: ContextEntry[] = [];
    const relatedContext: ContextEntry[] = [];

    try {
      // Get local context around the position
      const localQuery: ContextQuery = {
        query: `file:${filePath} position:${position.lineNumber}:${position.column}`,
        types: ['code', 'function', 'class', 'variable'],
        sources: [ContextSource.CODE_PATTERNS, ContextSource.SEMANTIC_CONTEXT],
        maxResults: 20,
        minQuality: 0.7
      };

      const localResult = await this.queryContext(localQuery);
      localContext.push(...localResult.entries);

      // Get related context if requested
      if (options.includeNeighbors || options.includeDependencies) {
        const relatedQuery: ContextQuery = {
          query: `related:${filePath}`,
          sources: [
            ContextSource.FILE_RELATIONSHIPS,
            ContextSource.DEPENDENCY_ANALYSIS,
            ContextSource.HISTORICAL_CONTEXT
          ],
          maxResults: 15,
          minQuality: 0.6
        };

        const relatedResult = await this.queryContext(relatedQuery);
        relatedContext.push(...relatedResult.entries);
      }

      return {
        localContext,
        relatedContext,
        quality: this.calculateOverallQuality([...localContext, ...relatedContext])
      };
    } catch (error) {
      console.error('Failed to get file context:', error);
      return {
        localContext: [],
        relatedContext: [],
        quality: this.createEmptyQuality()
      };
    }
  }

  /**
   * Update context quality based on usage and feedback
   */
  async updateContextQuality(
    entryIds: string[],
    feedback: {
      relevance?: number;
      accuracy?: number;
      usefulness?: number;
    }
  ): Promise<void> {
    for (const entryId of entryIds) {
      const entry = this.contextEntries.get(entryId);
      if (!entry) continue;

      const metadata = entry.metadata;
      metadata.accessCount++;
      metadata.lastAccessed = Date.now();

      // Update quality metrics
      if (feedback.relevance !== undefined) {
        metadata.quality.relevance = (metadata.quality.relevance + feedback.relevance) / 2;
      }
      if (feedback.accuracy !== undefined) {
        metadata.quality.accuracy = (metadata.quality.accuracy + feedback.accuracy) / 2;
      }
      if (feedback.usefulness !== undefined) {
        metadata.quality.completeness = (metadata.quality.completeness + feedback.usefulness) / 2;
      }

      // Recalculate overall quality
      metadata.quality.overall = (
        metadata.quality.completeness * 0.3 +
        metadata.quality.relevance * 0.3 +
        metadata.quality.freshness * 0.2 +
        metadata.quality.accuracy * 0.2
      );

      // Update freshness based on age
      const age = Date.now() - metadata.timestamp;
      const freshness = Math.max(0, 1 - (age / 86400000)); // 24 hours
      metadata.quality.freshness = freshness;
    }
  }

  /**
   * Clean up old or low-quality context entries
   */
  async cleanup(threshold: number = 0.3): Promise<number> {
    let cleanedCount = 0;

    for (const [id, entry] of Array.from(this.contextEntries)) {
      if (entry.metadata.quality.overall < threshold) {
        this.contextEntries.delete(id);
        this.contextRelationships.delete(id);
        cleanedCount++;
      }
    }

    // Clean up old cache entries
    this.cleanupCache();

    return cleanedCount;
  }

  // Private helper methods

  private async processEntries(
    rawEntries: any[],
    source: ContextSource,
    includeEmbeddings: boolean = false
  ): Promise<ContextEntry[]> {
    const processedEntries: ContextEntry[] = [];

    for (const rawEntry of rawEntries) {
      const entry: ContextEntry = {
        id: this.generateEntryId(source, rawEntry),
        type: rawEntry.type || 'unknown',
        content: rawEntry.content,
        metadata: this.createMetadata(source, rawEntry),
        relationships: []
      };

      if (includeEmbeddings) {
        entry.embeddings = await this.generateEmbeddings(entry);
      }

      processedEntries.push(entry);
    }

    return processedEntries;
  }

  private async storeEntries(entries: ContextEntry[]): Promise<void> {
    for (const entry of entries) {
      this.contextEntries.set(entry.id, entry);

      // Update index
      const typeIndex = this.contextIndex.get(entry.type) || new Set();
      typeIndex.add(entry.id);
      this.contextIndex.set(entry.type, typeIndex);

      const sourceIndex = this.contextIndex.get(entry.metadata.source) || new Set();
      sourceIndex.add(entry.id);
      this.contextIndex.set(entry.metadata.source, sourceIndex);
    }
  }

  private async buildRelationships(entries: ContextEntry[]): Promise<void> {
    // Build relationships between entries
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const relationship = await this.analyzeRelationship(entries[i], entries[j]);
        if (relationship) {
          entries[i].relationships.push(entries[j].id);
          entries[j].relationships.push(entries[i].id);

          const relArray = this.contextRelationships.get(entries[i].id) || [];
          relArray.push(relationship);
          this.contextRelationships.set(entries[i].id, relArray);
        }
      }
    }
  }

  private async findRelevantEntries(query: ContextQuery): Promise<ContextEntry[]> {
    const relevantEntries: ContextEntry[] = [];
    const queryTerms = query.query.toLowerCase().split(' ');

    // Search through all entries
    for (const entry of this.contextEntries.values()) {
      // Filter by types if specified
      if (query.types && !query.types.includes(entry.type)) {
        continue;
      }

      // Filter by sources if specified
      if (query.sources && !query.sources.includes(entry.metadata.source)) {
        continue;
      }

      // Calculate relevance score
      const relevance = this.calculateRelevance(entry, queryTerms);
      if (relevance > 0) {
        relevantEntries.push({ ...entry, metadata: { ...entry.metadata, confidence: relevance } });
      }
    }

    return relevantEntries;
  }

  private rankEntries(entries: ContextEntry[], query: ContextQuery): ContextEntry[] {
    return entries.sort((a, b) => {
      // Sort by quality first
      const qualityA = a.metadata.quality.overall;
      const qualityB = b.metadata.quality.overall;

      if (Math.abs(qualityA - qualityB) > 0.1) {
        return qualityB - qualityA;
      }

      // Then by relevance/confidence
      return b.metadata.confidence - a.metadata.confidence;
    });
  }

  private calculateOverallQuality(entries: ContextEntry[]): ContextQuality {
    if (entries.length === 0) {
      return this.createEmptyQuality();
    }

    const totalQuality = entries.reduce((acc, entry) => ({
      completeness: acc.completeness + entry.metadata.quality.completeness,
      relevance: acc.relevance + entry.metadata.quality.relevance,
      freshness: acc.freshness + entry.metadata.quality.freshness,
      accuracy: acc.accuracy + entry.metadata.quality.accuracy,
      overall: 0
    }), this.createEmptyQuality());

    return {
      completeness: totalQuality.completeness / entries.length,
      relevance: totalQuality.relevance / entries.length,
      freshness: totalQuality.freshness / entries.length,
      accuracy: totalQuality.accuracy / entries.length,
      overall: (totalQuality.completeness + totalQuality.relevance +
                totalQuality.freshness + totalQuality.accuracy) / 4
    };
  }

  private createEmptyQuality(): ContextQuality {
    return {
      completeness: 0,
      relevance: 0,
      freshness: 0,
      accuracy: 0,
      overall: 0
    };
  }

  private createMetadata(source: ContextSource, rawEntry: any): ContextMetadata {
    return {
      source,
      timestamp: Date.now(),
      confidence: rawEntry.confidence || 0.5,
      accessCount: 0,
      lastAccessed: Date.now(),
      dependencies: rawEntry.dependencies || [],
      tags: rawEntry.tags || [],
      quality: {
        completeness: 0.5,
        relevance: 0.5,
        freshness: 1.0,
        accuracy: 0.5,
        overall: 0.5
      }
    };
  }

  private generateEntryId(source: ContextSource, rawEntry: any): string {
    return `${source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async analyzeRelationship(entry1: ContextEntry, entry2: ContextEntry): Promise<ContextRelationship | null> {
    // Simple relationship analysis - could be enhanced with AI
    const content1 = JSON.stringify(entry1.content).toLowerCase();
    const content2 = JSON.stringify(entry2.content).toLowerCase();

    if (content1.includes(entry2.id) || content2.includes(entry1.id)) {
      return ContextRelationship.DEPENDS_ON;
    }

    // Check for semantic similarity
    const similarity = this.calculateSimilarity(content1, content2);
    if (similarity > 0.7) {
      return ContextRelationship.SIMILAR_TO;
    }

    return null;
  }

  private calculateRelevance(entry: ContextEntry, queryTerms: string[]): number {
    const content = JSON.stringify(entry.content).toLowerCase();
    let matches = 0;

    for (const term of queryTerms) {
      if (content.includes(term)) {
        matches++;
      }
    }

    return matches / queryTerms.length;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation - could be enhanced with embeddings
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  private async generateEmbeddings(entry: ContextEntry): Promise<number[]> {
    const embeddings = await this.aiService.executeTask({
      id: `embedding_${entry.id}`,
      description: `Generate embeddings for context entry`,
      requirements: ['embeddings'],
      priority: 'low'
    }, {
      context: {
        agentId: 'context-system',
        specialty: 'context-processing',
        capabilities: ['embeddings'],
        memory: { content: entry.content }
      },
      useCache: true
    });

    const cacheKey = `embedding_${JSON.stringify(entry.content)}`;

    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    // Generate embeddings using AI service
    try {
      // const embeddings = await this.aiService.executeTask({
      //   id: `embedding_${entry.id}`,
      //   description: `Generate embeddings for context entry`,
      //   requirements: ['embeddings'],
      //   priority: 'low'
      // }, {
      //   context: { content: entry.content },
      //   useCache: true
      // });

      this.embeddingCache.set(cacheKey, embeddings.output);
      return embeddings.output;
    } catch (error) {
      console.warn('Failed to generate embeddings:', error);
      return [];
    }
  }

  private getCachedResult(key: string, maxAge?: number): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (maxAge && age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedResult(key: string, data: any): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of Array.from(this.cache)) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Base class for context gathering workers
 */
abstract class ContextWorker {
  abstract gather(
    agentId: string,
    contextManager: AgentContextManager,
    aiService: AIService
  ): Promise<any[]>;
}

/**
 * Project structure context worker
 */
class ProjectStructureWorker extends ContextWorker {
  async gather(agentId: string, contextManager: AgentContextManager, aiService: AIService): Promise<any[]> {
    // Implementation would analyze project structure
    return [];
  }
}

/**
 * File relationships context worker
 */
class FileRelationshipWorker extends ContextWorker {
  async gather(agentId: string, contextManager: AgentContextManager, aiService: AIService): Promise<any[]> {
    // Implementation would analyze file relationships
    return [];
  }
}

/**
 * User behavior context worker
 */
class UserBehaviorWorker extends ContextWorker {
  async gather(agentId: string, contextManager: AgentContextManager, aiService: AIService): Promise<any[]> {
    // Implementation would analyze user behavior patterns
    return [];
  }
}

/**
 * Code patterns context worker
 */
class CodePatternWorker extends ContextWorker {
  async gather(agentId: string, contextManager: AgentContextManager, aiService: AIService): Promise<any[]> {
    // Implementation would analyze code patterns
    return [];
  }
}

/**
 * Dependency analysis context worker
 */
class DependencyAnalysisWorker extends ContextWorker {
  async gather(agentId: string, contextManager: AgentContextManager, aiService: AIService): Promise<any[]> {
    // Implementation would analyze dependencies
    return [];
  }
}

/**
 * Historical context worker
 */
class HistoricalContextWorker extends ContextWorker {
  async gather(agentId: string, contextManager: AgentContextManager, aiService: AIService): Promise<any[]> {
    // Implementation would analyze historical context
    return [];
  }
}

/**
 * Semantic context worker
 */
class SemanticContextWorker extends ContextWorker {
  async gather(agentId: string, contextManager: AgentContextManager, aiService: AIService): Promise<any[]> {
    // Implementation would analyze semantic context
    return [];
  }
}

/**
 * Performance context worker
 */
class PerformanceContextWorker extends ContextWorker {
  async gather(agentId: string, contextManager: AgentContextManager, aiService: AIService): Promise<any[]> {
    // Implementation would analyze performance context
    return [];
  }
}
