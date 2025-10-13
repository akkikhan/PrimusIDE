import { AIService } from './AIService';
import { ContextAwarenessSystem, ContextEntry, ContextQuery, ContextSource } from './ContextAwarenessSystem';
import { AgentContextManager } from './AgentContextManager';
import { Task, TaskResult } from './types';

/**
 * Search result with ranking information
 */
export interface SearchResult {
  entry: ContextEntry;
  score: number;
  rank: number;
  matchType: 'semantic' | 'lexical' | 'hybrid';
  highlights: string[];
  metadata: {
    retrievalTime: number;
    searchMethod: string;
    confidence: number;
  };
}

/**
 * Hybrid search configuration
 */
export interface HybridSearchConfig {
  semanticWeight: number; // 0-1, weight for semantic search
  lexicalWeight: number; // 0-1, weight for lexical search
  minScore: number; // Minimum score threshold
  maxResults: number; // Maximum number of results to return
  includeHighlights: boolean; // Whether to include text highlights
  rerank: boolean; // Whether to apply reranking
}

/**
 * Retrieval statistics
 */
export interface RetrievalStats {
  totalSearches: number;
  averagePrecision: number;
  averageRecall: number;
  searchTimeDistribution: number[];
  methodUsage: Record<string, number>;
  topKAccuracy: number[];
}

/**
 * Advanced Hybrid Retrieval Ranking System
 * Combines semantic and lexical search with intelligent ranking
 */
export class HybridRetrievalRanking {
  private aiService: AIService;
  private contextSystem: ContextAwarenessSystem;
  private contextManager: AgentContextManager;
  private semanticIndex: Map<string, number[]> = new Map();
  private lexicalIndex: Map<string, string[]> = new Map();
  private searchCache: Map<string, SearchResult[]> = new Map();
  private stats: RetrievalStats;

  // Configuration
  private readonly DEFAULT_CONFIG: HybridSearchConfig = {
    semanticWeight: 0.6,
    lexicalWeight: 0.4,
    minScore: 0.1,
    maxResults: 20,
    includeHighlights: true,
    rerank: true
  };

  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 200;

  constructor(
    aiService: AIService,
    contextSystem: ContextAwarenessSystem,
    contextManager: AgentContextManager
  ) {
    this.aiService = aiService;
    this.contextSystem = contextSystem;
    this.contextManager = contextManager;
    this.stats = this.initializeStats();
    this.initializeIndexes();
  }

  /**
   * Perform hybrid search combining semantic and lexical methods
   */
  async search(
    query: string,
    config: Partial<HybridSearchConfig> = {}
  ): Promise<SearchResult[]> {
    const searchConfig = { ...this.DEFAULT_CONFIG, ...config };
    const cacheKey = `search_${query}_${JSON.stringify(searchConfig)}`;

    // Check cache first
    const cached = this.getCachedResults(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Perform parallel searches
      const [semanticResults, lexicalResults] = await Promise.all([
        this.semanticSearch(query, searchConfig),
        this.lexicalSearch(query, searchConfig)
      ]);

      // Combine and rank results
      const hybridResults = this.combineResults(
        semanticResults,
        lexicalResults,
        searchConfig
      );

      // Apply reranking if enabled
      const finalResults = searchConfig.rerank
        ? await this.rerankResults(hybridResults, query, searchConfig)
        : hybridResults;

      // Add highlights if requested
      const resultsWithHighlights = searchConfig.includeHighlights
        ? await this.addHighlights(finalResults, query)
        : finalResults.map(result => ({ ...result, highlights: [] }));

      // Convert to SearchResult format
      const searchResults: SearchResult[] = resultsWithHighlights.map((result, index) => ({
        entry: result.entry,
        score: result.score,
        rank: index + 1,
        matchType: result.method as 'semantic' | 'lexical' | 'hybrid',
        highlights: result.highlights || [],
        metadata: {
          retrievalTime: Date.now(),
          searchMethod: result.method,
          confidence: result.score
        }
      }));

      // Update statistics
      this.updateStats(query, searchResults, Date.now() - startTime);

      // Cache results
      this.cacheResults(cacheKey, searchResults);

      return searchResults;
    } catch (error) {
      console.error('Hybrid search failed:', error);
      return [];
    }
  }

  /**
   * Search with context awareness
   */
  async searchWithContext(
    query: ContextQuery,
    agentId: string,
    config: Partial<HybridSearchConfig> = {}
  ): Promise<{
    results: SearchResult[];
    context: any;
    performance: {
      searchTime: number;
      contextGatheringTime: number;
      totalTime: number;
    };
  }> {
    const startTime = Date.now();
    const contextStartTime = Date.now();

    // Gather context for the agent
    const contextEntries = await this.contextSystem.gatherContext(agentId, {
      sources: query.sources,
      includeEmbeddings: true
    });

    const contextGatheringTime = Date.now() - contextStartTime;

    // Update query with context
    const enrichedQuery = this.enrichQueryWithContext(query, contextEntries);

    // Perform search
    const results = await this.search(enrichedQuery, config);

    return {
      results,
      context: contextEntries,
      performance: {
        searchTime: Date.now() - startTime - contextGatheringTime,
        contextGatheringTime,
        totalTime: Date.now() - startTime
      }
    };
  }

  /**
   * Get retrieval statistics
   */
  getStatistics(): RetrievalStats {
    return { ...this.stats };
  }

  /**
   * Clear search cache and reset statistics
   */
  clearCache(): void {
    this.searchCache.clear();
    this.stats = this.initializeStats();
  }

  /**
   * Update search indexes with new context entries
   */
  async updateIndexes(entries: ContextEntry[]): Promise<void> {
    for (const entry of entries) {
      // Update semantic index
      if (entry.embeddings) {
        this.semanticIndex.set(entry.id, entry.embeddings);
      }

      // Update lexical index
      const lexicalTerms = this.extractLexicalTerms(entry);
      this.lexicalIndex.set(entry.id, lexicalTerms);
    }
  }

  // Private methods

  private initializeStats(): RetrievalStats {
    return {
      totalSearches: 0,
      averagePrecision: 0,
      averageRecall: 0,
      searchTimeDistribution: [],
      methodUsage: {
        semantic: 0,
        lexical: 0,
        hybrid: 0
      },
      topKAccuracy: []
    };
  }

  private initializeIndexes(): void {
    // Initialize with empty indexes - would be populated with context entries
    this.semanticIndex.clear();
    this.lexicalIndex.clear();
  }

  private async semanticSearch(
    query: string,
    config: HybridSearchConfig
  ): Promise<Array<{ entry: ContextEntry; score: number; method: string }>> {
    const results: Array<{ entry: ContextEntry; score: number; method: string }> = [];

    // Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(query);
    if (!queryEmbedding) return results;

    // Search through semantic index
    for (const [entryId, entryEmbedding] of this.semanticIndex) {
      const entry = await this.getContextEntry(entryId);
      if (!entry) continue;

      const similarity = this.calculateCosineSimilarity(queryEmbedding, entryEmbedding);
      if (similarity >= config.minScore) {
        results.push({
          entry,
          score: similarity,
          method: 'semantic'
        });
      }
    }

    // Sort by similarity score
    return results.sort((a, b) => b.score - a.score);
  }

  private async lexicalSearch(
    query: string,
    config: HybridSearchConfig
  ): Promise<Array<{ entry: ContextEntry; score: number; method: string }>> {
    const results: Array<{ entry: ContextEntry; score: number; method: string }> = [];
    const queryTerms = this.tokenizeQuery(query);

    // Search through lexical index
    for (const [entryId, terms] of this.lexicalIndex) {
      const entry = await this.getContextEntry(entryId);
      if (!entry) continue;

      const score = this.calculateLexicalScore(queryTerms, terms);
      if (score >= config.minScore) {
        results.push({
          entry,
          score,
          method: 'lexical'
        });
      }
    }

    // Sort by lexical score
    return results.sort((a, b) => b.score - a.score);
  }

  private combineResults(
    semanticResults: Array<{ entry: ContextEntry; score: number; method: string }>,
    lexicalResults: Array<{ entry: ContextEntry; score: number; method: string }>,
    config: HybridSearchConfig
  ): Array<{ entry: ContextEntry; score: number; method: string }> {
    const combined = new Map<string, { entry: ContextEntry; score: number; method: string }>();
    const semanticWeight = config.semanticWeight;
    const lexicalWeight = config.lexicalWeight;

    // Process semantic results
    for (const result of semanticResults) {
      const existing = combined.get(result.entry.id);
      if (existing) {
        // Combine scores
        existing.score = existing.score * (1 - semanticWeight) + result.score * semanticWeight;
        existing.method = 'hybrid';
      } else {
        combined.set(result.entry.id, {
          entry: result.entry,
          score: result.score * semanticWeight,
          method: 'semantic'
        });
      }
    }

    // Process lexical results
    for (const result of lexicalResults) {
      const existing = combined.get(result.entry.id);
      if (existing) {
        // Combine scores
        existing.score = existing.score * (1 - lexicalWeight) + result.score * lexicalWeight;
        existing.method = 'hybrid';
      } else {
        combined.set(result.entry.id, {
          entry: result.entry,
          score: result.score * lexicalWeight,
          method: 'lexical'
        });
      }
    }

    // Convert to array and sort
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, config.maxResults);
  }

  private async rerankResults(
    results: Array<{ entry: ContextEntry; score: number; method: string }>,
    originalQuery: string,
    config: HybridSearchConfig
  ): Promise<Array<{ entry: ContextEntry; score: number; method: string }>> {
    // AI-powered reranking
    const task: Task = {
      id: `rerank_${Date.now()}`,
      description: `Rerank search results for query: ${originalQuery}`,
      requirements: ['ranking', 'relevance'],
      priority: 'medium'
    };

    const response = await this.aiService.executeTask(task, {
      context: {
        agentId: 'reranker',
        specialty: 'search-ranking',
        capabilities: ['ranking', 'relevance'],
        memory: { results, query: originalQuery }
      },
      useCache: true
    });

    if (!response.success) return results;

    // Parse reranking results
    const rerankedScores = this.parseRerankingResponse(response.output);

    // Apply reranking scores
    return results.map(result => ({
      ...result,
      score: rerankedScores[result.entry.id] || result.score
    })).sort((a, b) => b.score - a.score);
  }

  private parseRerankingResponse(response: any): Record<string, number> {
    // Implementation would parse AI reranking response
    // For now, return original scores
    const scores: Record<string, number> = {};

    // This would be populated based on AI response
    return scores;
  }

  private async addHighlights(
    results: Array<{ entry: ContextEntry; score: number; method: string }>,
    query: string
  ): Promise<Array<{ entry: ContextEntry; score: number; method: string; highlights: string[] }>> {
    const queryTerms = this.tokenizeQuery(query);

    return results.map(result => ({
      ...result,
      highlights: this.generateHighlights(result.entry, queryTerms)
    }));
  }

  private generateHighlights(entry: ContextEntry, queryTerms: string[]): string[] {
    const highlights: string[] = [];
    const content = JSON.stringify(entry.content).toLowerCase();

    for (const term of queryTerms) {
      const index = content.indexOf(term.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + term.length + 50);
        const highlight = content.substring(start, end);
        highlights.push(`...${highlight}...`);
      }
    }

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  private async generateQueryEmbedding(query: string): Promise<number[] | null> {
    const task: Task = {
      id: `embedding_${Date.now()}`,
      description: `Generate embedding for query: ${query}`,
      requirements: ['embeddings'],
      priority: 'low'
    };

    const response = await this.aiService.executeTask(task, {
      context: {
        agentId: 'embedding-generator',
        specialty: 'embeddings',
        capabilities: ['embeddings'],
        memory: { query }
      },
      useCache: true
    });

    return response.success ? response.output : null;
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private tokenizeQuery(query: string): string[] {
    return query.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .map(term => term.replace(/[^\w]/g, ''));
  }

  private calculateLexicalScore(queryTerms: string[], documentTerms: string[]): number {
    const querySet = new Set(queryTerms);
    const docSet = new Set(documentTerms);

    const intersection = new Set([...querySet].filter(x => docSet.has(x)));
    const union = new Set([...querySet, ...docSet]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private extractLexicalTerms(entry: ContextEntry): string[] {
    const content = JSON.stringify(entry.content);
    return this.tokenizeQuery(content);
  }

  private async getContextEntry(entryId: string): Promise<ContextEntry | null> {
    // This would typically query the context system
    // For now, return null - implementation would depend on context system interface
    return null;
  }

  private enrichQueryWithContext(query: ContextQuery, contextEntries: ContextEntry[]): string {
    const contextTerms = contextEntries
      .flatMap(entry => this.extractLexicalTerms(entry))
      .slice(0, 10); // Limit context terms

    return `${query.query} ${contextTerms.join(' ')}`;
  }

  private getCachedResults(cacheKey: string): SearchResult[] | null {
    const cached = this.searchCache.get(cacheKey);
    if (!cached) return null;

    const age = Date.now() - cached[0]?.metadata?.retrievalTime;
    if (age > this.CACHE_TTL) {
      this.searchCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  private cacheResults(cacheKey: string, results: SearchResult[]): void {
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.searchCache.keys())[0];
      this.searchCache.delete(oldestKey);
    }

    this.searchCache.set(cacheKey, results);
  }

  private updateStats(query: string, results: SearchResult[], searchTime: number): void {
    this.stats.totalSearches++;
    this.stats.searchTimeDistribution.push(searchTime);

    // Update method usage
    const methodCounts = results.reduce((acc, result) => {
      acc[result.matchType] = (acc[result.matchType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [method, count] of Object.entries(methodCounts)) {
      this.stats.methodUsage[method] = (this.stats.methodUsage[method] || 0) + count;
    }

    // Keep only recent search times
    if (this.stats.searchTimeDistribution.length > 100) {
      this.stats.searchTimeDistribution = this.stats.searchTimeDistribution.slice(-100);
    }
  }
}