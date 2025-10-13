// Collaboration Server Startup Script - FIXED
// Initializes and starts the real-time collaboration server with proper configuration

import CollaborationServer from './CollaborationServer';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

interface ServerConfig {
  port: number;
  host: string;
  enableCors: boolean;
  maxConnections: number;
  heartbeatInterval: number;
  cleanupInterval: number;
  operationHistoryLimit: number;
  enableSSL: boolean;
  sslCertPath?: string;
  sslKeyPath?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  metricsPort?: number;
}

const defaultConfig: ServerConfig = {
  port: 3001,
  host: '0.0.0.0',
  enableCors: true,
  maxConnections: 1000,
  heartbeatInterval: 30000,  cleanupInterval: 300000,
  operationHistoryLimit: 1000,
  enableSSL: false,
  logLevel: 'info',
  enableMetrics: true,
  metricsPort: 3002
};

function loadConfig(): ServerConfig {
  const config = { ...defaultConfig };
  
  if (process.env.COLLABORATION_PORT) {
    config.port = parseInt(process.env.COLLABORATION_PORT, 10);
  }
  
  if (process.env.COLLABORATION_HOST) {
    config.host = process.env.COLLABORATION_HOST;
  }
  
  if (process.env.COLLABORATION_MAX_CONNECTIONS) {
    config.maxConnections = parseInt(process.env.COLLABORATION_MAX_CONNECTIONS, 10);
  }
  
  if (process.env.COLLABORATION_LOG_LEVEL) {
    config.logLevel = process.env.COLLABORATION_LOG_LEVEL as ServerConfig['logLevel'];
  }
  
  if (process.env.COLLABORATION_ENABLE_SSL === 'true') {
    config.enableSSL = true;
    config.sslCertPath = process.env.COLLABORATION_SSL_CERT;    config.sslKeyPath = process.env.COLLABORATION_SSL_KEY;
  }
  
  const configPath = path.join(process.cwd(), 'collaboration.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.assign(config, fileConfig);
    } catch (error) {
      console.warn('Failed to load config file:', error);
    }
  }
  
  return config;
}

function setupLogging(logLevel: ServerConfig['logLevel']): void {
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(logLevel);
  
  if (currentLevelIndex > 0) {
    console.debug = () => {};
  }
  
  if (currentLevelIndex > 1) {
    console.info = console.log;
  }
  
  if (currentLevelIndex > 2) {
    console.warn = () => {};
  }
}
function createCorsMiddleware(req: any, res: any, next: any): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  next();
}

function createMetricsServer(collaborationServer: CollaborationServer, port: number): void {
  const metricsServer = createServer((req, res) => {
    if (req.url === '/metrics' && req.method === 'GET') {
      const stats = collaborationServer.getStats();
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        collaboration: stats,
        version: process.env.npm_package_version || '1.0.0'
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(metrics, null, 2));    } else if (req.url === '/health' && req.method === 'GET') {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          server: 'ok',
          memory: process.memoryUsage().heapUsed < 1024 * 1024 * 1024 ? 'ok' : 'warning',
          uptime: process.uptime() > 0 ? 'ok' : 'error'
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(health, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  metricsServer.listen(port, () => {
    console.log(`📊 Metrics server running on port ${port}`);
  });
}

function setupGracefulShutdown(collaborationServer: CollaborationServer): void {
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    collaborationServer.shutdown();
    
    setTimeout(() => {      console.log('👋 Goodbye!');
      process.exit(0);
    }, 5000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
  
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught exception:', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

async function startCollaborationServer(): Promise<void> {
  console.log('🚀 Starting Primus IDE Collaboration Server...\n');
  
  const config = loadConfig();
  setupLogging(config.logLevel);
  
  try {
    const collaborationServer = new CollaborationServer(config.port);
    collaborationServer.startPeriodicCleanup();
    
    if (config.enableMetrics && config.metricsPort) {      createMetricsServer(collaborationServer, config.metricsPort);
    }
    
    setupGracefulShutdown(collaborationServer);
    
    collaborationServer.on('connection', (info: any) => {
      console.log(`📡 New connection from ${info.clientId}`);
    });
    
    collaborationServer.on('document-created', (documentId: string) => {
      console.log(`📄 Document created: ${documentId}`);
    });
    
    collaborationServer.on('user-joined', (userId: string, documentId: string) => {
      console.log(`👤 User ${userId} joined document ${documentId}`);
    });
    
    collaborationServer.on('user-left', (userId: string, documentId: string) => {
      console.log(`👤 User ${userId} left document ${documentId}`);
    });
    
    collaborationServer.on('operation-applied', (operationId: string, documentId: string) => {
      console.log(`✏️ Operation ${operationId} applied to document ${documentId}`);
    });

    console.log(`\n✅ Collaboration server is running on ws://localhost:${config.port}`);
    
    if (config.enableMetrics && config.metricsPort) {
      console.log(`📊 Metrics available at http://localhost:${config.metricsPort}/metrics`);
      console.log(`🏥 Health check at http://localhost:${config.metricsPort}/health`);
    }
    setInterval(() => {
      const stats = collaborationServer.getStats();
      if (stats.activeConnections > 0 || stats.activeDocuments > 0) {
        console.log(`📊 Stats: ${stats.activeConnections} connections, ${stats.activeDocuments} documents`);
      }
    }, 60000);
    
  } catch (error) {
    console.error('💥 Failed to start collaboration server:', error);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node collaboration-server.js [options]

Options:
  --port <port>          Server port (default: 3001)
  --host <string>        Server host (default: 0.0.0.0)
  --log-level <level>    Log level: debug, info, warn, error (default: info)
  --enable-ssl           Enable SSL/TLS
  --ssl-cert <path>      Path to SSL certificate
  --ssl-key <path>       Path to SSL private key
  --metrics-port <port>  Metrics server port (default: 3002)
  --help, -h             Show this help message

Environment Variables:  COLLABORATION_PORT              Server port
  COLLABORATION_HOST              Server host
  COLLABORATION_MAX_CONNECTIONS   Maximum connections
  COLLABORATION_LOG_LEVEL         Log level
  COLLABORATION_ENABLE_SSL        Enable SSL (true/false)
  COLLABORATION_SSL_CERT          SSL certificate path
  COLLABORATION_SSL_KEY           SSL private key path

Configuration File:
  Create a collaboration.config.json file in the current directory with your settings.

Examples:
  node collaboration-server.js --port 3001 --log-level info
  COLLABORATION_PORT=3001 node collaboration-server.js
    `);
    process.exit(0);
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log('Primus IDE Collaboration Server v1.0.0');
    process.exit(0);
  }
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--port':
        if (nextArg) process.env.COLLABORATION_PORT = nextArg;
        i++;        break;
      case '--host':
        if (nextArg) process.env.COLLABORATION_HOST = nextArg;
        i++;
        break;
      case '--log-level':
        if (nextArg) process.env.COLLABORATION_LOG_LEVEL = nextArg;
        i++;
        break;
      case '--enable-ssl':
        process.env.COLLABORATION_ENABLE_SSL = 'true';
        break;
      case '--ssl-cert':
        if (nextArg) process.env.COLLABORATION_SSL_CERT = nextArg;
        i++;
        break;
      case '--ssl-key':
        if (nextArg) process.env.COLLABORATION_SSL_KEY = nextArg;
        i++;
        break;
      case '--metrics-port':
        if (nextArg) process.env.COLLABORATION_METRICS_PORT = nextArg;
        i++;
        break;
    }
  }
  
  startCollaborationServer().catch(error => {
    console.error('💥 Server startup failed:', error);
    process.exit(1);
  });
}

export { startCollaborationServer, loadConfig, ServerConfig };

if (require.main === module) {
  main();
}
