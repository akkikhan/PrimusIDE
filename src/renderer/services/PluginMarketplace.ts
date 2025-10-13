// Plugin Marketplace Integration - Comprehensive marketplace for plugin discovery and distribution
// Handles plugin publishing, discovery, ratings, reviews, and marketplace management

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

// Marketplace plugin information
export interface MarketplacePlugin {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: MarketplacePublisher;
  categories: string[];
  tags: string[];
  pricing: 'free' | 'premium' | 'subscription';
  price?: number;
  currency?: string;
  
  // Metadata
  downloadCount: number;
  rating: number;
  ratingCount: number;
  featured: boolean;
  verified: boolean;
  
  // Dates
  publishedDate: Date;
  lastUpdated: Date;
  
  // Files and assets
  icon?: string;
  gallery: string[];
  readme: string;
  changelog: string;
  license: string;
  
  // Technical details
  engines: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  activationEvents: string[];
  contributes: any;
  
  // Package info
  packageSize: number;
  downloadUrl: string;
  repositoryUrl?: string;
  homepageUrl?: string;
  bugsUrl?: string;
  
  // Analytics
  weeklyDownloads: number;
  monthlyDownloads: number;
  totalDownloads: number;
  
  // Reviews and ratings
  reviews: PluginReview[];
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

// Publisher information
export interface MarketplacePublisher {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  avatar?: string;
  website?: string;
  verified: boolean;
  pluginCount: number;
  totalDownloads: number;
  joinDate: Date;
}

// Plugin review
export interface PluginReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  helpful: number;
  notHelpful: number;
  pluginVersion: string;
  createdDate: Date;
  updatedDate?: Date;
  verified: boolean;
}

// Search filters
export interface MarketplaceSearchFilters {
  query?: string;
  category?: string;
  pricing?: 'free' | 'premium' | 'subscription' | 'all';
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'name' | 'date' | 'trending';
  sortOrder?: 'asc' | 'desc';
  verified?: boolean;
  featured?: boolean;
  minRating?: number;
  publisher?: string;
  tags?: string[];
  engines?: Record<string, string>;
  priceRange?: { min: number; max: number };
}

// Search result
export interface MarketplaceSearchResult {
  plugins: MarketplacePlugin[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: {
    categories: Record<string, number>;
    tags: Record<string, number>;
    publishers: Record<string, number>;
    ratings: Record<number, number>;
  };
}

// Plugin analytics
export interface PluginAnalytics {
  pluginId: string;
  downloadStats: {
    daily: number[];
    weekly: number[];
    monthly: number[];
    dates: string[];
  };
  ratingStats: {
    average: number;
    distribution: Record<number, number>;
    trend: number[];
  };
  userStats: {
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
  };
  performanceStats: {
    averageActivationTime: number;
    averageMemoryUsage: number;
    crashRate: number;
    errorRate: number;
  };
  geographicStats: Record<string, number>;
  versionStats: Record<string, number>;
}

// Publication metadata
export interface PublicationMetadata {
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  categories: string[];
  tags: string[];
  pricing: 'free' | 'premium' | 'subscription';
  price?: number;
  currency?: string;
  icon?: string;
  gallery?: string[];
  readme?: string;
  changelog?: string;
  license: string;
  repositoryUrl?: string;
  homepageUrl?: string;
  bugsUrl?: string;
  engines: Record<string, string>;
  activationEvents: string[];
  contributes: any;
}

// Plugin Marketplace Integration class
export class PluginMarketplace extends EventEmitter {
  private apiUrl: string;
  private authToken?: string;
  private cache: Map<string, any>;
  private cacheExpiry: Map<string, number>;
  private requestQueue: Array<() => Promise<any>>;
  private isProcessingQueue: boolean;

  constructor(apiUrl: string = 'https://api.plugin-marketplace.com') {
    super();
    this.apiUrl = apiUrl;
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Search plugins in marketplace
   */
  async searchPlugins(
    filters: MarketplaceSearchFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<MarketplaceSearchResult> {
    const cacheKey = `search_${JSON.stringify(filters)}_${page}_${pageSize}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...this.buildSearchParams(filters)
      });

      const response = await this.makeRequest(`/plugins/search?${queryParams}`);
      const result = await response.json();

      // Cache result
      this.setCache(cacheKey, result, 5 * 60 * 1000); // 5 minutes

      this.emit('search-completed', { filters, result });
      return result;
    } catch (error) {
      console.error('Failed to search plugins:', error);
      this.emit('search-error', { filters, error });
      throw error;
    }
  }

  /**
   * Get plugin details
   */
  async getPlugin(pluginId: string): Promise<MarketplacePlugin> {
    const cacheKey = `plugin_${pluginId}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest(`/plugins/${pluginId}`);
      const plugin = await response.json();

      // Cache result
      this.setCache(cacheKey, plugin, 10 * 60 * 1000); // 10 minutes

      this.emit('plugin-loaded', plugin);
      return plugin;
    } catch (error) {
      console.error('Failed to get plugin:', error);
      this.emit('plugin-load-error', { pluginId, error });
      throw error;
    }
  }

  /**
   * Get plugin reviews
   */
  async getPluginReviews(
    pluginId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ reviews: PluginReview[]; totalCount: number }> {
    const cacheKey = `reviews_${pluginId}_${page}_${pageSize}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest(
        `/plugins/${pluginId}/reviews?page=${page}&pageSize=${pageSize}`
      );
      const result = await response.json();

      // Cache result
      this.setCache(cacheKey, result, 5 * 60 * 1000); // 5 minutes

      return result;
    } catch (error) {
      console.error('Failed to get plugin reviews:', error);
      throw error;
    }
  }

  /**
   * Submit plugin review
   */
  async submitReview(
    pluginId: string,
    rating: number,
    title: string,
    comment: string
  ): Promise<PluginReview> {
    if (!this.authToken) {
      throw new Error('Authentication required to submit reviews');
    }

    try {
      const response = await this.makeRequest(`/plugins/${pluginId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          rating,
          title,
          comment
        })
      });

      const review = await response.json();
      
      // Invalidate reviews cache
      this.invalidateCache(`reviews_${pluginId}`);
      
      this.emit('review-submitted', review);
      return review;
    } catch (error) {
      console.error('Failed to submit review:', error);
      this.emit('review-submit-error', { pluginId, error });
      throw error;
    }
  }

  /**
   * Download plugin
   */
  async downloadPlugin(pluginId: string, version?: string): Promise<ArrayBuffer> {
    try {
      const url = version 
        ? `/plugins/${pluginId}/download/${version}`
        : `/plugins/${pluginId}/download`;
        
      const response = await this.makeRequest(url);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const data = await response.arrayBuffer();
      
      this.emit('plugin-downloaded', { pluginId, version, size: data.byteLength });
      return data;
    } catch (error) {
      console.error('Failed to download plugin:', error);
      this.emit('plugin-download-error', { pluginId, version, error });
      throw error;
    }
  }

  /**
   * Publish plugin
   */
  async publishPlugin(
    packagePath: string,
    metadata: PublicationMetadata
  ): Promise<MarketplacePlugin> {
    if (!this.authToken) {
      throw new Error('Authentication required to publish plugins');
    }

    try {
      // Read package file
      const packageData = fs.readFileSync(packagePath);
      
      // Create form data
      const formData = new FormData();
      formData.append('package', new Blob([packageData]), path.basename(packagePath));
      formData.append('metadata', JSON.stringify(metadata));

      const response = await this.makeRequest('/plugins/publish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      const plugin = await response.json();
      
      this.emit('plugin-published', plugin);
      return plugin;
    } catch (error) {
      console.error('Failed to publish plugin:', error);
      this.emit('plugin-publish-error', { packagePath, error });
      throw error;
    }
  }

  /**
   * Update plugin
   */
  async updatePlugin(
    pluginId: string,
    packagePath: string,
    metadata: Partial<PublicationMetadata>
  ): Promise<MarketplacePlugin> {
    if (!this.authToken) {
      throw new Error('Authentication required to update plugins');
    }

    try {
      // Read package file
      const packageData = fs.readFileSync(packagePath);
      
      // Create form data
      const formData = new FormData();
      formData.append('package', new Blob([packageData]), path.basename(packagePath));
      formData.append('metadata', JSON.stringify(metadata));

      const response = await this.makeRequest(`/plugins/${pluginId}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      const plugin = await response.json();
      
      // Invalidate cache
      this.invalidateCache(`plugin_${pluginId}`);
      
      this.emit('plugin-updated', plugin);
      return plugin;
    } catch (error) {
      console.error('Failed to update plugin:', error);
      this.emit('plugin-update-error', { pluginId, error });
      throw error;
    }
  }

  /**
   * Unpublish plugin
   */
  async unpublishPlugin(pluginId: string): Promise<void> {
    if (!this.authToken) {
      throw new Error('Authentication required to unpublish plugins');
    }

    try {
      const response = await this.makeRequest(`/plugins/${pluginId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Unpublish failed: ${response.statusText}`);
      }
      
      // Invalidate cache
      this.invalidateCache(`plugin_${pluginId}`);
      
      this.emit('plugin-unpublished', { pluginId });
    } catch (error) {
      console.error('Failed to unpublish plugin:', error);
      this.emit('plugin-unpublish-error', { pluginId, error });
      throw error;
    }
  }

  /**
   * Get plugin analytics
   */
  async getPluginAnalytics(
    pluginId: string,
    timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<PluginAnalytics> {
    if (!this.authToken) {
      throw new Error('Authentication required to view analytics');
    }

    const cacheKey = `analytics_${pluginId}_${timeRange}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest(
        `/plugins/${pluginId}/analytics?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );

      const analytics = await response.json();
      
      // Cache result
      this.setCache(cacheKey, analytics, 60 * 60 * 1000); // 1 hour

      return analytics;
    } catch (error) {
      console.error('Failed to get plugin analytics:', error);
      throw error;
    }
  }

  /**
   * Get publisher information
   */
  async getPublisher(publisherId: string): Promise<MarketplacePublisher> {
    const cacheKey = `publisher_${publisherId}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest(`/publishers/${publisherId}`);
      const publisher = await response.json();

      // Cache result
      this.setCache(cacheKey, publisher, 30 * 60 * 1000); // 30 minutes

      return publisher;
    } catch (error) {
      console.error('Failed to get publisher:', error);
      throw error;
    }
  }

  /**
   * Get publisher plugins
   */
  async getPublisherPlugins(
    publisherId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ plugins: MarketplacePlugin[]; totalCount: number }> {
    const cacheKey = `publisher_plugins_${publisherId}_${page}_${pageSize}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest(
        `/publishers/${publisherId}/plugins?page=${page}&pageSize=${pageSize}`
      );
      const result = await response.json();

      // Cache result
      this.setCache(cacheKey, result, 10 * 60 * 1000); // 10 minutes

      return result;
    } catch (error) {
      console.error('Failed to get publisher plugins:', error);
      throw error;
    }
  }

  /**
   * Get trending plugins
   */
  async getTrendingPlugins(
    timeRange: 'day' | 'week' | 'month' = 'week',
    limit: number = 10
  ): Promise<MarketplacePlugin[]> {
    const cacheKey = `trending_${timeRange}_${limit}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest(
        `/plugins/trending?timeRange=${timeRange}&limit=${limit}`
      );
      const plugins = await response.json();

      // Cache result
      this.setCache(cacheKey, plugins, 15 * 60 * 1000); // 15 minutes

      return plugins;
    } catch (error) {
      console.error('Failed to get trending plugins:', error);
      throw error;
    }
  }

  /**
   * Get featured plugins
   */
  async getFeaturedPlugins(limit: number = 10): Promise<MarketplacePlugin[]> {
    const cacheKey = `featured_${limit}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest(`/plugins/featured?limit=${limit}`);
      const plugins = await response.json();

      // Cache result
      this.setCache(cacheKey, plugins, 30 * 60 * 1000); // 30 minutes

      return plugins;
    } catch (error) {
      console.error('Failed to get featured plugins:', error);
      throw error;
    }
  }

  /**
   * Get plugin categories
   */
  async getCategories(): Promise<Array<{ id: string; name: string; count: number }>> {
    const cacheKey = 'categories';
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest('/categories');
      const categories = await response.json();

      // Cache result
      this.setCache(cacheKey, categories, 60 * 60 * 1000); // 1 hour

      return categories;
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Report plugin issue
   */
  async reportPlugin(
    pluginId: string,
    reason: string,
    description: string
  ): Promise<void> {
    if (!this.authToken) {
      throw new Error('Authentication required to report plugins');
    }

    try {
      const response = await this.makeRequest(`/plugins/${pluginId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          reason,
          description
        })
      });

      if (!response.ok) {
        throw new Error(`Report failed: ${response.statusText}`);
      }
      
      this.emit('plugin-reported', { pluginId, reason });
    } catch (error) {
      console.error('Failed to report plugin:', error);
      this.emit('plugin-report-error', { pluginId, error });
      throw error;
    }
  }

  /**
   * Build search parameters
   */
  private buildSearchParams(filters: MarketplaceSearchFilters): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters.query) {
      params.q = filters.query;
    }

    if (filters.category) {
      params.category = filters.category;
    }

    if (filters.pricing && filters.pricing !== 'all') {
      params.pricing = filters.pricing;
    }

    if (filters.sortBy) {
      params.sortBy = filters.sortBy;
    }

    if (filters.sortOrder) {
      params.sortOrder = filters.sortOrder;
    }

    if (filters.verified !== undefined) {
      params.verified = filters.verified.toString();
    }

    if (filters.featured !== undefined) {
      params.featured = filters.featured.toString();
    }

    if (filters.minRating) {
      params.minRating = filters.minRating.toString();
    }

    if (filters.publisher) {
      params.publisher = filters.publisher;
    }

    if (filters.tags && filters.tags.length > 0) {
      params.tags = filters.tags.join(',');
    }

    if (filters.engines) {
      params.engines = JSON.stringify(filters.engines);
    }

    if (filters.priceRange) {
      params.priceMin = filters.priceRange.min.toString();
      params.priceMax = filters.priceRange.max.toString();
    }

    return params;
  }

  /**
   * Make HTTP request with queue management
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const url = `${this.apiUrl}${endpoint}`;
          const response = await fetch(url, {
            ...options,
            headers: {
              'User-Agent': 'PluginMarketplace/1.0.0',
              ...options.headers
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          resolve(response);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Request failed:', error);
        }
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): any {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  /**
   * Set cache
   */
  private setCache(key: string, value: any, ttl: number): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need to track hits/misses for real implementation
    };
  }
}

export default PluginMarketplace;
