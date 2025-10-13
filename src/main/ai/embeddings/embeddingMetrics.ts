import fs from 'fs';
import path from 'path';
import { onEmbeddingBatch } from './embeddingTelemetry.js';

export interface ProviderMetrics {
  providerId: string;
  calls: number;
  streamingCalls: number;
  errors: number;
  cancellations: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  totalTokensEst: number;
  totalCostEst: number;
  embeddingBatches?: number;
  embeddingItems?: number;
  embeddingTimeMs?: number;
}

const providerMetrics = new Map<string, ProviderMetrics>();

export function ensureMetrics(id: string): ProviderMetrics {
  let m = providerMetrics.get(id);
  if(!m){
    m = { providerId: id, calls:0, streamingCalls:0, errors:0, cancellations:0, totalLatencyMs:0, avgLatencyMs:0, totalTokensEst:0, totalCostEst:0, embeddingBatches:0, embeddingItems:0, embeddingTimeMs:0 };
    providerMetrics.set(id, m);
  }
  return m;
}

function metricsFilePath(){
  return path.join(process.cwd(), 'artifacts','ai','metrics.json');
}

function loadProviderMetrics(){
  try {
    const file = metricsFilePath();
    if(fs.existsSync(file)){
      const raw = JSON.parse(fs.readFileSync(file,'utf8'));
      if(Array.isArray(raw.providers)){
        for(const m of raw.providers){
          if(!m || !m.providerId) continue;
          const rec: ProviderMetrics = {
            providerId: String(m.providerId),
            calls: Number(m.calls)||0,
            streamingCalls: Number(m.streamingCalls)||0,
            errors: Number(m.errors)||0,
            cancellations: Number(m.cancellations)||0,
            totalLatencyMs: Number(m.totalLatencyMs)||0,
            avgLatencyMs: 0,
            totalTokensEst: Number(m.totalTokensEst)||0,
            totalCostEst: Number(m.totalCostEst)||0,
            embeddingBatches: Number((m as any).embeddingBatches)||0,
            embeddingItems: Number((m as any).embeddingItems)||0,
            embeddingTimeMs: Number((m as any).embeddingTimeMs)||0
          };
          providerMetrics.set(rec.providerId, rec);
        }
      }
    }
  } catch{/* ignore */}
}

export function persistProviderMetrics(){
  try {
    const arr = Array.from(providerMetrics.values());
    const out = { providers: arr, generatedAt: new Date().toISOString() };
    const file = metricsFilePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(out, null, 2),'utf8');
  } catch{/* ignore */}
}

let persistTimer: NodeJS.Timeout | null = null;
function startPersistence(){
  if(persistTimer) return;
  persistTimer = setInterval(persistProviderMetrics, 15000);
}

export function forcePersistProviderMetrics(){ persistProviderMetrics(); }

export function getProviderMetricsSnapshot(): ProviderMetrics[]{
  return Array.from(providerMetrics.values()).map(m => ({
    ...m,
    avgLatencyMs: (m.calls + m.streamingCalls) > 0 ? m.totalLatencyMs / (m.calls + m.streamingCalls) : 0
  }));
}

onEmbeddingBatch(e => {
  try {
    const m = ensureMetrics(e.providerId);
    m.embeddingBatches = (m.embeddingBatches||0) + 1;
    m.embeddingItems = (m.embeddingItems||0) + e.batchSize;
    m.embeddingTimeMs = (m.embeddingTimeMs||0) + e.durationMs;
  } catch{/* ignore */}
});

loadProviderMetrics();
startPersistence();
