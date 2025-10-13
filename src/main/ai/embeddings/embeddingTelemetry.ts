import { EventEmitter } from 'events';

// Lightweight internal telemetry emitter for embedding operations.
// TODO: When a global telemetry / metrics bus is introduced, forward these events there
//       (e.g. mainTelemetry.emit('ai.embedding.batch', payload)).

export interface EmbeddingBatchEvent {
  providerId: string;
  batchSize: number;      // Size of this individual internal batch slice
  totalItems: number;     // Total number of texts in the original request
  durationMs: number;     // Duration for this slice embed call
  model: string;          // Model identifier returned by provider
}

const emitter = new EventEmitter();

export function onEmbeddingBatch(listener: (e: EmbeddingBatchEvent) => void) {
  emitter.on('embedding.batch', listener);
}

export function emitEmbeddingBatch(e: EmbeddingBatchEvent) {
  emitter.emit('embedding.batch', e);
}

// Convenience: future additional events (e.g. provider switch) can share this emitter.
export const embeddingTelemetryEmitter = emitter;
