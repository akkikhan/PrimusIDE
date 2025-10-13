import type { EmbeddingProvider, EmbeddingProviderInfo, EmbedRequest, EmbedResponse } from '../../../shared/embeddingTypes.js';
import https from 'https';

interface OpenAIEmbeddingResponse { data: { embedding: number[] }[]; model: string; }

function sleep(ms: number){ return new Promise(res => setTimeout(res, ms)); }

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  info: EmbeddingProviderInfo;
  private apiKey: string;
  private model: string;
  private endpoint: string;
  private maxRetries = 4;

  constructor(opts: { apiKey: string; model?: string; endpoint?: string; dimensions?: number }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model || 'text-embedding-3-small';
    this.endpoint = opts.endpoint || 'https://api.openai.com/v1/embeddings';
    // Dimensions for text-embedding-3-small = 1536 (adjust if using other model)
    const dims = opts.dimensions || 1536;
    this.info = {
      id: 'openai',
      name: 'OpenAI',
      dimensions: dims,
      supportsBatch: true,
      maxBatchSize: 128
    };
  }

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    // OpenAI accepts a batch array in one request for embeddings (input can be string or array)
    const body = JSON.stringify({ input: req.texts, model: this.model });
    let attempt = 0;
    while(true){
      try {
        const result: OpenAIEmbeddingResponse = await this.doRequest(body);
        const vectors = result.data.map(d => d.embedding);
        return { vectors, model: result.model, dimensions: this.info.dimensions, providerId: this.info.id };
      } catch (e:any) {
        const retryable = this.isRetryable(e);
        if(!retryable || attempt >= this.maxRetries) throw e;
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000) + Math.random()*200;
        await sleep(delay);
        attempt++;
      }
    }
  }

  private isRetryable(err: any){
    if(!err) return false;
    const msg = String(err.message || err || '');
    return /(rate limit|timeout|ECONNRESET|EAI_AGAIN|429)/i.test(msg);
  }

  private doRequest(body: string): Promise<OpenAIEmbeddingResponse> {
    return new Promise((resolve, reject) => {
      const req = https.request(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body)
        }
      }, res => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', d => raw += d);
        res.on('end', () => {
          if(res.statusCode && res.statusCode >= 400){
            return reject(new Error('OpenAI error ' + res.statusCode + ' ' + raw.slice(0,300)));
          }
          try {
            const parsed = JSON.parse(raw);
            if(!parsed || !Array.isArray(parsed.data)) return reject(new Error('Invalid OpenAI embedding response'));
            resolve(parsed as OpenAIEmbeddingResponse);
          } catch (e: any){ reject(e); }
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
      req.write(body);
      req.end();
    });
  }
}
