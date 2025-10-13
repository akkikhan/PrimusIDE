// src/main/debug/DebugManager.ts
import { DebugSession, InitializedEvent, TerminatedEvent, StoppedEvent, OutputEvent } from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';

class NodeDebugSession extends DebugSession {
    private runtime: ChildProcess | null = null;
    private programPath: string | null = null;
    private lineCounter = 0;
    private paused = false;

    public constructor() {
        super();
        this.setDebuggerLinesStartAt1(true);
        this.setDebuggerColumnsStartAt1(true);
    }

    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = true;
        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    public launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments & { program: string }): void {
        this.programPath = args.program;
        this.runtime = spawn('node', [args.program], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });

        this.runtime.stdout?.on('data', (data) => {
            this.sendEvent(new OutputEvent(data.toString(), 'stdout'));
        });

        this.runtime.stderr?.on('data', (data) => {
            this.sendEvent(new OutputEvent(data.toString(), 'stderr'));
        });

        this.runtime.on('exit', () => {
            this.sendEvent(new TerminatedEvent());
        });

        // Simulate an initial pause after launch for demonstration
        setTimeout(() => {
            this.paused = true;
            this.sendEvent(new StoppedEvent('breakpoint', 1));
        }, 300);

        this.sendResponse(response);
    }

    public disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
        this.runtime?.kill();
        this.sendResponse(response);
    }

    public continue(): void {
        if (!this.paused) return;
        this.paused = false;
        this.sendEvent(new OutputEvent('Continuing execution\n', 'stdout'));
        // Simulate hitting next pause
        setTimeout(() => {
            this.lineCounter += 1;
            this.paused = true;
            this.sendEvent(new StoppedEvent('step', 1));
        }, 400);
    }

    public step(type: 'over' | 'in' | 'out'): void {
        if (!this.paused) return;
        this.paused = false;
        this.sendEvent(new OutputEvent(`Step ${type}\n`, 'stdout'));
        setTimeout(() => {
            this.lineCounter += 1;
            this.paused = true;
            this.sendEvent(new StoppedEvent('step', 1));
        }, 250);
    }

    public getStackFrames(): any[] {
        // Mock stack frames
        return [
            { id: 1, name: 'main', line: 10 + this.lineCounter, source: this.programPath },
            { id: 2, name: 'helper', line: 5 + this.lineCounter, source: this.programPath }
        ];
    }

    public getVariables(frameId: number): any[] {
        // Mock variables
        return [
            { name: 'counter', value: String(this.lineCounter) },
            { name: 'frameId', value: String(frameId) }
        ];
    }
}


export class DebugManager {
    private session: NodeDebugSession | null = null;
    private window: BrowserWindow;

    constructor(window: BrowserWindow) {
        this.window = window;
    }

    public start(programPath: string) {
        if (this.session) {
            this.session.shutdown();
        }

        this.session = new NodeDebugSession();

        this.session.on('output', (event: OutputEvent) => {
            this.window.webContents.send('debug:output', event.body.category, event.body.output);
        });

        this.session.on('stopped', (event: StoppedEvent) => {
            this.window.webContents.send('debug:stopped', event.body);
            // Emit stack and variables when paused
            const frames = this.session?.getStackFrames() || [];
            this.window.webContents.send('debug:stack', frames);
            if (frames.length) {
                const vars = this.session?.getVariables(frames[0].id) || [];
                this.window.webContents.send('debug:variables', { frameId: frames[0].id, variables: vars });
            }
        });

        this.session.on('terminated', () => {
            this.window.webContents.send('debug:terminated');
            this.session = null;
        });
        
        // This is a mock of how a debug adapter is started.
        // In a real scenario, the session would be started in a separate process
        // and communicate over stdio.
        // For this example, we'll manually drive it.
        
        this.session.start(process.stdin, process.stdout);
        (this.session as any).launchRequest({} as any, { program: programPath } as any);
    }

    public stop() {
        (this.session as any)?.disconnectRequest({} as any, {});
    }

    public continue() {
        this.session?.continue();
    }

    public stepOver() {
        this.session?.step('over');
    }

    public stepIn() {
        this.session?.step('in');
    }

    public stepOut() {
        this.session?.step('out');
    }
}
