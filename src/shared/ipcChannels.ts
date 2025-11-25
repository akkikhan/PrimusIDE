// Centralized IPC channel name constants
// Keep naming consistent: domain:action
export const IPC_CHANNELS = {
  CONTEXT_BUILD: 'context:build',
  AI_REQUEST: 'ai:request',
  AI_STREAM_REQUEST: 'ai:stream:request',
  AI_STREAM_CHUNK: 'ai:stream:chunk',
  AI_STREAM_COMPLETE: 'ai:stream:complete',
  AI_STREAM_CANCEL: 'ai:stream:cancel',
  TOOL_LIST: 'tool:list',
  TOOL_INVOKE: 'tool:invoke',
  AI_PROVIDERS_LIST: 'ai:providers:list',
  AI_STATS_GET: 'ai:stats:get',
  AI_CONTEXT_GATHER: 'ai:context:gather',
  AI_PIN_ADD: 'ai:pin:add',
  AI_PIN_REMOVE: 'ai:pin:remove',
  AI_PIN_LIST: 'ai:pin:list',
  AI_CONFIG_GET: 'ai:config:get',
  AI_CONFIG_GET_SYNC: 'ai:config:getSync',
  AI_CONFIG_SET: 'ai:config:set',
  AI_CONFIG_CLEAR: 'ai:config:clear',
  TERMINAL_EXECUTE: 'terminal:executeCommand',
  TERMINAL_CWD: 'terminal:getCurrentDir',
  GIT_IS_REPO: 'git:isRepo',
  GIT_STATUS: 'git:getStatus',
  GIT_BRANCHES: 'git:getBranches',
  GIT_STAGE: 'git:stage',
  GIT_UNSTAGE: 'git:unstage',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',
  GIT_CREATE_BRANCH: 'git:createBranch',
  GIT_INIT: 'git:init',
  GIT_DIFF: 'git:getDiff',
  GIT_HISTORY: 'git:getCommitHistory',
  REINDEX_START: 'retrieval:reindex:start',
  REINDEX_CANCEL: 'retrieval:reindex:cancel',
  REINDEX_PROGRESS_EVENT: 'retrieval:reindex:progress', // event: { runId, processed, totalFiles, vectors, phase }
  REINDEX_COMPLETE_EVENT: 'retrieval:reindex:complete', // event: { runId, summary }
  REINDEX_SUMMARY_GET: 'retrieval:reindex:summary:get'
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

