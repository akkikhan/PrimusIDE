// Plugin Architecture System - Extensible plugin ecosystem with dynamic loading and lifecycle management
// Security sandboxing, API exposure, marketplace integration, and comprehensive plugin management

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
// VS Code types for plugin architecture (renderer-compatible definitions)
export interface TextEditor {
  document: TextDocument;
  selection: Selection;
  selections: Selection[];
  visibleRanges: Range[];
  options: TextEditorOptions;
  viewColumn?: ViewColumn;
}

export interface Selection extends Range {
  anchor: Position;
  active: Position;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  character: number;
}

export interface Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;
}

export interface TextEditorOptions {
  tabSize?: number;
  insertSpaces?: boolean;
  cursorStyle?: TextEditorCursorStyle;
  lineNumbers?: TextEditorLineNumbersStyle;
}

export enum TextEditorCursorStyle {
  Line = 1,
  Block = 2,
  Underline = 3,
  LineThin = 4,
  BlockOutline = 5,
  UnderlineThin = 6
}

export enum TextEditorLineNumbersStyle {
  Off = 0,
  On = 1,
  Relative = 2
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9
}

export interface TextEditorSelectionChangeEvent {
  textEditor: TextEditor;
  selections: Selection[];
  kind?: TextEditorSelectionChangeKind;
}

export interface TextEditorVisibleRangesChangeEvent {
  textEditor: TextEditor;
  visibleRanges: Range[];
}

export interface TextEditorOptionsChangeEvent {
  textEditor: TextEditor;
  options: TextEditorOptions;
}

export interface TextEditorViewColumnChangeEvent {
  textEditor: TextEditor;
  viewColumn: ViewColumn;
}

export enum TextEditorSelectionChangeKind {
  Keyboard = 1,
  Mouse = 2,
  Command = 3
}

export interface DocumentSelector {
  language?: string;
  scheme?: string;
  pattern?: string;
}

export interface CodeActionProvider {
  provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext, token: CancellationToken): ProviderResult<(Command | CodeAction)[]>;
}

export interface CodeActionProviderMetadata {
  providedCodeActionKinds?: CodeActionKind[];
  documentation?: CodeActionDocumentation[];
}

export interface CodeLensProvider {
  provideCodeLenses(document: TextDocument, token: CancellationToken): ProviderResult<CodeLens[]>;
  resolveCodeLens?(codeLens: CodeLens, token: CancellationToken): ProviderResult<CodeLens>;
}

export interface DefinitionProvider {
  provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]>;
}

export interface ImplementationProvider {
  provideImplementation(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]>;
}

export interface TypeDefinitionProvider {
  provideTypeDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]>;
}

export interface HoverProvider {
  provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover>;
}

export interface DocumentHighlightProvider {
  provideDocumentHighlights(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<DocumentHighlight[]>;
}

export interface DocumentSymbolProvider {
  provideDocumentSymbols(document: TextDocument, token: CancellationToken): ProviderResult<SymbolInformation[] | DocumentSymbol[]>;
}

export interface DocumentSymbolProviderMetadata {
  label?: string;
}

export interface WorkspaceSymbolProvider {
  provideWorkspaceSymbols(query: string, token: CancellationToken): ProviderResult<SymbolInformation[]>;
  resolveWorkspaceSymbol?(symbol: SymbolInformation, token: CancellationToken): ProviderResult<SymbolInformation>;
}

export interface ReferenceProvider {
  provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): ProviderResult<Location[]>;
}

export interface RenameProvider {
  provideRenameEdits(document: TextDocument, position: Position, newName: string, token: CancellationToken): ProviderResult<WorkspaceEdit>;
  prepareRename?(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Range | { range: Range; placeholder: string; }>;
}

export interface DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>;
}

export interface DocumentRangeFormattingEditProvider {
  provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>;
}

export interface OnTypeFormattingEditProvider {
  provideOnTypeFormattingEdits(document: TextDocument, position: Position, ch: string, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>;
}

export interface SignatureHelpProvider {
  provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken, context: SignatureHelpContext): ProviderResult<SignatureHelp>;
}

export interface CompletionItemProvider {
  provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList>;
  resolveCompletionItem?(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem>;
}

export interface DocumentLinkProvider {
  provideDocumentLinks(document: TextDocument, token: CancellationToken): ProviderResult<DocumentLink[]>;
  resolveDocumentLink?(link: DocumentLink, token: CancellationToken): ProviderResult<DocumentLink>;
}

export interface DocumentColorProvider {
  provideDocumentColors(document: TextDocument, token: CancellationToken): ProviderResult<ColorInformation[]>;
  provideColorPresentations(color: Color, context: { document: TextDocument; range: Range; }, token: CancellationToken): ProviderResult<ColorPresentation[]>;
}

export interface FoldingRangeProvider {
  provideFoldingRanges(document: TextDocument, context: FoldingContext, token: CancellationToken): ProviderResult<FoldingRange[]>;
}

export interface SelectionRangeProvider {
  provideSelectionRanges(document: TextDocument, positions: Position[], token: CancellationToken): ProviderResult<SelectionRange[]>;
}

export interface CallHierarchyProvider {
  prepareCallHierarchy(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<CallHierarchyItem[]>;
  provideCallHierarchyIncomingCalls(item: CallHierarchyItem, token: CancellationToken): ProviderResult<CallHierarchyIncomingCall[]>;
  provideCallHierarchyOutgoingCalls(item: CallHierarchyItem, token: CancellationToken): ProviderResult<CallHierarchyOutgoingCall[]>;
}

export interface DocumentSemanticTokensProvider {
  provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): ProviderResult<SemanticTokens>;
  provideDocumentSemanticTokensEdits?(document: TextDocument, previousResultId: string, token: CancellationToken): ProviderResult<SemanticTokens | SemanticTokensEdits>;
}

export interface DocumentRangeSemanticTokensProvider {
  provideDocumentRangeSemanticTokens(document: TextDocument, range: Range, token: CancellationToken): ProviderResult<SemanticTokens>;
}

export interface SemanticTokensLegend {
  tokenTypes: string[];
  tokenModifiers: string[];
}

export interface TextDocumentContentProvider {
  provideTextDocumentContent(uri: Uri, token: CancellationToken): ProviderResult<string>;
  onDidChange?: Event<Uri>;
}

export interface ProgressReporter<T> {
  report(value: T): void;
}

export interface TreeViewOptions<T> {
  treeDataProvider: TreeDataProvider<T>;
  showCollapseAll?: boolean;
  canSelectMany?: boolean;
}

export interface TreeView<T> {
  selection: T[];
  visible: boolean;
  onDidChangeSelection: Event<TreeViewSelectionChangeEvent<T>>;
  onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;
  reveal(element: T, options?: { select?: boolean; focus?: boolean; expand?: boolean | number; }): Thenable<void>;
  dispose(): void;
}

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
}

export interface QuickPick<T extends QuickPickItem> {
  value: string;
  placeholder: string | undefined;
  readonly onDidChangeValue: Event<string>;
  readonly onDidAccept: Event<void>;
  buttons: readonly QuickInputButton[];
  readonly onDidTriggerButton: Event<QuickInputButton>;
  items: readonly T[];
  canSelectMany: boolean;
  matchOnDescription: boolean;
  matchOnDetail: boolean;
  keepScrollPosition?: boolean;
  activeItems: readonly T[];
  readonly onDidChangeActive: Event<readonly T[]>;
  selectedItems: readonly T[];
  readonly onDidChangeSelection: Event<readonly T[]>;
  title: string | undefined;
  step: number | undefined;
  totalSteps: number | undefined;
  enabled: boolean;
  busy: boolean;
  ignoreFocusOut: boolean;
  show(): void;
  hide(): void;
  readonly onDidHide: Event<void>;
  dispose(): void;
}

export interface InputBox {
  value: string;
  valueSelection: readonly [number, number] | undefined;
  placeholder: string | undefined;
  password: boolean;
  readonly onDidChangeValue: Event<string>;
  readonly onDidAccept: Event<void>;
  buttons: readonly QuickInputButton[];
  readonly onDidTriggerButton: Event<QuickInputButton>;
  prompt: string | undefined;
  validationMessage: string | undefined;
  title: string | undefined;
  step: number | undefined;
  totalSteps: number | undefined;
  enabled: boolean;
  busy: boolean;
  ignoreFocusOut: boolean;
  show(): void;
  hide(): void;
  readonly onDidHide: Event<void>;
  dispose(): void;
}

export interface FileType {
  Unknown: number;
  File: number;
  Directory: number;
  SymbolicLink: number;
}

export interface FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;
}

export interface Repository {
  rootUri: Uri;
  inputBox: SourceControlInputBox;
  state: RepositoryState;
}

export interface CloneOptions {
  readonly ignoreFocusOut?: boolean;
}

export interface Webview {
  options: WebviewOptions;
  html: string;
  readonly onDidReceiveMessage: Event<any>;
  postMessage(message: any): Thenable<boolean>;
  readonly cspSource: string;
  readonly asWebviewUri: (localResource: Uri) => Uri;
}

export interface WebviewPanelShowOptions {
  readonly viewColumn: ViewColumn;
  readonly preserveFocus?: boolean;
}

export interface WebviewPanelSerializer<T = {}> {
  deserializeWebviewPanel(webviewPanel: WebviewPanel, state: T): Thenable<void>;
}

export interface NotebookExecuteHandler {
  (cells: NotebookCell[], notebook: NotebookDocument, controller: NotebookController): void | Thenable<void>;
}

export interface NotebookRendererScript {
  readonly id: string;
  readonly entrypoint: Uri;
}

export interface NotebookController {
  readonly id: string;
  readonly notebookType: string;
  readonly supportedLanguages?: readonly string[];
  readonly supportsExecutionOrder?: boolean;
  readonly label: string;
  readonly description?: string;
  readonly detail?: string;
  executeHandler: NotebookExecuteHandler;
  readonly onDidChangeSelectedNotebooks: Event<{ readonly notebook: NotebookDocument; readonly selected: boolean; }>;
  createNotebookCellExecution(cell: NotebookCell): NotebookCellExecution;
  dispose(): void;
}

export interface NotebookCellStatusBarItemProvider {
  provideCellStatusBarItems(cell: NotebookCell, token: CancellationToken): ProviderResult<NotebookCellStatusBarItem[]>;
}

export interface NotebookRendererMessaging {
  readonly onDidReceiveMessage: Event<{ readonly editor: NotebookEditor; readonly message: any; }>;
  postMessage(message: any, editor?: NotebookEditor): Thenable<boolean>;
}

export interface AuthenticationGetSessionOptions {
  createIfNone?: boolean;
  clearSessionPreference?: boolean;
  silent?: boolean;
}

export interface AuthenticationSession {
  readonly id: string;
  readonly accessToken: string;
  readonly account: AuthenticationSessionAccountInformation;
  readonly scopes: readonly string[];
}

export interface AuthenticationProvider {
  readonly onDidChangeSessions: Event<AuthenticationProviderAuthenticationSessionsChangeEvent>;
  getSessions(scopes?: readonly string[]): Thenable<readonly AuthenticationSession[]>;
  createSession(scopes: readonly string[]): Thenable<AuthenticationSession>;
  removeSession(sessionId: string): Thenable<void>;
}

export interface AuthenticationProviderOptions {
  readonly supportsMultipleAccounts?: boolean;
}

export interface TestController {
  readonly id: string;
  readonly label: string;
  readonly items: TestItemCollection;
  createRunProfile(label: string, kind: TestRunProfileKind, runHandler: (request: TestRunRequest, token: CancellationToken) => void | Thenable<void>, isDefault?: boolean, tag?: TestTag): TestRunProfile;
  createTestItem(id: string, label: string, uri?: Uri): TestItem;
  createTestRun(request: TestRunRequest, name?: string, persist?: boolean): TestRun;
  dispose(): void;
}

export interface TestItem {
  readonly id: string;
  readonly uri: Uri | undefined;
  readonly children: TestItemCollection;
  readonly parent: TestItem | undefined;
  label: string;
  description?: string;
  sortText?: string;
  canResolveChildren: boolean;
  busy: boolean;
  tags: readonly TestTag[];
  range: Range | undefined;
  error: string | MarkdownString | undefined;
}

export interface TestRunRequest {
  readonly include: readonly TestItem[] | undefined;
  readonly exclude: readonly TestItem[] | undefined;
  readonly profile: TestRunProfile | undefined;
  readonly continuous?: boolean;
}

export interface TestRun {
  readonly name: string | undefined;
  readonly token: CancellationToken;
  readonly isPersisted: boolean;
  enqueued(test: TestItem): void;
  started(test: TestItem): void;
  skipped(test: TestItem): void;
  failed(test: TestItem, message: TestMessage | readonly TestMessage[], duration?: number): void;
  errored(test: TestItem, message: TestMessage | readonly TestMessage[], duration?: number): void;
  passed(test: TestItem, duration?: number): void;
  appendOutput(output: string, location?: Location, test?: TestItem): void;
  end(): void;
}

export interface MarkdownString {
  readonly value: string;
  readonly isTrusted?: boolean | MarkdownStringTrustedOptions;
  readonly supportThemeIcons?: boolean;
  readonly supportHtml?: boolean;
  readonly baseUri?: Uri;
  appendText(value: string): MarkdownString;
  appendMarkdown(value: string): MarkdownString;
  appendCodeblock(value: string, language?: string): MarkdownString;
}

export interface ThemeColor {
  readonly id: string;
}

export interface Command {
  title: string;
  command: string;
  tooltip?: string;
  arguments?: any[];
}

export interface AccessibilityInformation {
  label: string;
  role?: string;
}

export interface WebviewPortMapping {
  readonly webviewPort: number;
  readonly extensionHostPort: number;
}

export interface ThemeIcon {
  readonly id: string;
  readonly color?: ThemeColor;
}

export interface WebviewPanelOnDidChangeViewStateEvent {
  readonly webviewPanel: WebviewPanel;
}

export interface CustomDocument {
  readonly uri: Uri;
  dispose(): void;
}

export interface CustomDocumentOpenContext {
  readonly backupId?: string;
  readonly untitledDocumentData?: Uint8Array;
}

export enum EndOfLine {
  LF = 1,
  CRLF = 2
}

export interface TextLine {
  readonly lineNumber: number;
  readonly text: string;
  readonly range: Range;
  readonly rangeIncludingLineBreak: Range;
  readonly firstNonWhitespaceCharacterIndex: number;
  readonly isEmptyOrWhitespace: boolean;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface WorkspaceEditEntryMetadata {
  needsConfirmation: boolean;
  label: string;
  description?: string;
  iconPath?: Uri | { light: Uri; dark: Uri; } | ThemeIcon;
}

export interface Extension<T> {
  readonly id: string;
  readonly extensionUri: Uri;
  readonly extensionPath: string;
  readonly isActive: boolean;
  readonly packageJSON: any;
  readonly exports: T;
  activate(): Thenable<T>;
}

// Common types
export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;
export type Event<T> = (listener: (e: T) => any, thisArg?: any) => Disposable;
export interface Disposable {
  dispose(): void;
}
export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly onCancellationRequested: Event<any>;
}

// Additional VS Code types for compatibility
export interface Location {
  uri: Uri;
  range: Range;
}

export interface LocationLink {
  originSelectionRange?: Range;
  targetUri: Uri;
  targetRange: Range;
  targetSelectionRange: Range;
}

export interface CodeActionContext {
  diagnostics: Diagnostic[];
  only?: CodeActionKind[];
}

export interface CodeAction {
  title: string;
  kind?: CodeActionKind;
  diagnostics?: Diagnostic[];
  isPreferred?: boolean;
  disabled?: { reason: string; };
  edit?: WorkspaceEdit;
  command?: Command;
}

export interface CodeActionKind {
  value: string;
}

export interface CodeActionDocumentation {
  kind: CodeActionKind;
  command: Command;
}

export interface CodeLens {
  range: Range;
  command?: Command;
}

export interface Definition extends Location {}

export interface Hover {
  contents: MarkdownString | MarkdownString[] | string | string[];
  range?: Range;
}

export interface DocumentHighlight {
  range: Range;
  kind?: DocumentHighlightKind;
}

export enum DocumentHighlightKind {
  Text = 0,
  Read = 1,
  Write = 2
}

export interface SymbolInformation {
  name: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  deprecated?: boolean;
  location: Location;
  containerName?: string;
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  deprecated?: boolean;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
  EnumMember = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25
}

export enum SymbolTag {
  Deprecated = 1
}

export interface ReferenceContext {
  includeDeclaration: boolean;
}

export interface WorkspaceEdit {
  has(uri: Uri): boolean;
  set(uri: Uri, edits: TextEdit[]): void;
  get(uri: Uri): TextEdit[] | undefined;
  delete(uri: Uri): void;
  size: number;
  entries(): [Uri, TextEdit[]][];
}

export interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
  [key: string]: boolean | number | string;
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string | MarkdownString;
  parameters?: ParameterInformation[];
  activeParameter?: number;
}

export interface ParameterInformation {
  label: string | [number, number];
  documentation?: string | MarkdownString;
}

export interface SignatureHelpContext {
  triggerKind: SignatureHelpTriggerKind;
  triggerCharacter?: string;
  isRetrigger: boolean;
  activeSignatureHelp?: SignatureHelp;
}

export enum SignatureHelpTriggerKind {
  Invoke = 1,
  TriggerCharacter = 2,
  ContentChange = 3
}

export interface CompletionItem {
  label: string | CompletionItemLabel;
  kind?: CompletionItemKind;
  tags?: CompletionItemTag[];
  detail?: string;
  documentation?: string | MarkdownString;
  deprecated?: boolean;
  preselect?: boolean;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  range?: Range | { inserting: Range; replacing: Range; };
  commitCharacters?: string[];
  textEdit?: TextEdit;
  additionalTextEdits?: TextEdit[];
  command?: Command;
}

export interface CompletionItemLabel {
  label: string;
  detail?: string;
  description?: string;
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  Reference = 17,
  File = 16,
  Folder = 18,
  EnumMember = 19,
  Constant = 20,
  Struct = 21,
  Event = 22,
  Operator = 23,
  TypeParameter = 24
}

export enum CompletionItemTag {
  Deprecated = 1
}

export interface CompletionContext {
  triggerKind: CompletionTriggerKind;
  triggerCharacter?: string;
}

export enum CompletionTriggerKind {
  Invoke = 0,
  TriggerCharacter = 1,
  TriggerForIncompleteCompletions = 2
}

export interface CompletionList {
  isIncomplete?: boolean;
  items: CompletionItem[];
}

export interface DocumentLink {
  range: Range;
  target?: Uri;
  tooltip?: string;
}

export interface Color {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export interface ColorInformation {
  range: Range;
  color: Color;
}

export interface ColorPresentation {
  label: string;
  textEdit?: TextEdit;
  additionalTextEdits?: TextEdit[];
}

export interface FoldingRange {
  start: number;
  end: number;
  kind?: FoldingRangeKind;
}

export enum FoldingRangeKind {
  Comment = 1,
  Imports = 2,
  Region = 3
}

export interface FoldingContext {
  maxRanges: number;
}

export interface SelectionRange {
  range: Range;
  parent?: SelectionRange;
}

export interface CallHierarchyItem {
  name: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  detail?: string;
  uri: Uri;
  range: Range;
  selectionRange: Range;
  data?: any;
}

export interface CallHierarchyIncomingCall {
  from: CallHierarchyItem;
  fromRanges: Range[];
}

export interface CallHierarchyOutgoingCall {
  to: CallHierarchyItem;
  fromRanges: Range[];
}

export interface SemanticTokens {
  readonly resultId?: string;
  readonly data: Uint32Array;
}

export interface SemanticTokensEdits {
  readonly resultId?: string;
  readonly edits: SemanticTokensEdit[];
}

export interface SemanticTokensEdit {
  readonly start: number;
  readonly deleteCount: number;
  readonly data?: Uint32Array;
}

export interface Diagnostic {
  range: Range;
  message: string;
  severity?: DiagnosticSeverity;
  code?: string | number | { value: string | number; target: Uri; };
  codeDescription?: CodeDescription;
  source?: string;
  tags?: DiagnosticTag[];
  relatedInformation?: DiagnosticRelatedInformation[];
  data?: any;
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2
}

export interface CodeDescription {
  href: Uri;
}

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface Thenable<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | Thenable<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | Thenable<TResult2>) | undefined | null
  ): Thenable<TResult1 | TResult2>;
}

// Additional missing types for tree view and other components
export interface TreeDataProvider<T> {
  onDidChangeTreeData?: Event<T | undefined | null | void>;
  getTreeItem(element: T): TreeViewItem | Thenable<TreeViewItem>;
  getChildren(element?: T): ProviderResult<T[]>;
  getParent?(element: T): ProviderResult<T>;
  resolveTreeItem?(item: TreeViewItem, element: T, token: CancellationToken): ProviderResult<TreeViewItem>;
}

export interface TreeViewItem {
  id?: string;
  label?: string | TreeViewItemLabel;
  iconPath?: string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;
  description?: string | boolean;
  resourceUri?: Uri;
  tooltip?: string | MarkdownString;
  command?: Command;
  collapsibleState?: TreeItemCollapsibleState;
  contextValue?: string;
  accessibilityInformation?: AccessibilityInformation;
}

export interface TreeViewItemLabel {
  label: string;
  highlights?: [number, number][];
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2
}

export interface TreeViewSelectionChangeEvent<T> {
  readonly selection: T[];
}

export interface TreeViewVisibilityChangeEvent {
  readonly visible: boolean;
}

export interface QuickInputButton {
  iconPath: Uri | { light: Uri; dark: Uri } | ThemeIcon;
  tooltip?: string;
}

export interface SourceControlInputBox {
  value: string;
  placeholder: string;
  enabled: boolean;
  visible: boolean;
  readonly onDidChange: Event<string>;
}

export interface RepositoryState {
  HEAD?: Branch;
  refs?: Ref[];
  remotes?: Remote[];
  submodules?: Submodule[];
  rebaseCommit?: Commit;
  mergeChanges?: Change[];
  indexChanges?: Change[];
  workingTreeChanges?: Change[];
}

export interface Branch {
  name?: string;
  commit?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
}

export interface Ref {
  type: RefType;
  name?: string;
  commit?: string;
  remote?: string;
}

export enum RefType {
  Head,
  RemoteHead,
  Tag
}

export interface Remote {
  name: string;
  fetchUrl?: string;
  pushUrl?: string;
  isReadOnly: boolean;
}

export interface Submodule {
  name: string;
  path: string;
  url: string;
}

export interface Commit {
  hash: string;
  message: string;
  parents: string[];
  authorDate?: Date;
  authorName?: string;
  authorEmail?: string;
  commitDate?: Date;
}

export interface Change {
  uri: Uri;
  originalUri: Uri;
  renameUri?: Uri;
  status: Status;
}

export enum Status {
  INDEX_MODIFIED,
  INDEX_ADDED,
  INDEX_DELETED,
  INDEX_RENAMED,
  INDEX_COPIED,
  MODIFIED,
  DELETED,
  UNTRACKED,
  IGNORED,
  INTENT_TO_ADD
}

export interface WebviewOptions {
  enableScripts?: boolean;
  enableForms?: boolean;
  localResourceRoots?: Uri[];
  portMapping?: WebviewPortMapping[];
}

export interface WebviewPanelOptions {
  enableFindWidget?: boolean;
  retainContextWhenHidden?: boolean;
}

export interface WebviewPanel {
  readonly viewType: string;
  title: string;
  readonly iconPath?: Uri | { light: Uri; dark: Uri };
  readonly webview: Webview;
  readonly options: WebviewPanelOptions;
  readonly viewColumn: ViewColumn | undefined;
  readonly active: boolean;
  readonly visible: boolean;
  readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;
  readonly onDidDispose: Event<void>;
  reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
  dispose(): void;
}

export interface NotebookDocument {
  readonly uri: Uri;
  readonly notebookType: string;
  readonly version: number;
  readonly isDirty: boolean;
  readonly isUntitled: boolean;
  readonly isClosed: boolean;
  readonly metadata: { [key: string]: any; };
  readonly cellCount: number;
  cellAt(index: number): NotebookCell;
  getCells(range?: NotebookRange): NotebookCell[];
  save(): Thenable<boolean>;
}

export interface NotebookRange {
  readonly start: number;
  readonly end: number;
}

export interface NotebookCell {
  readonly index: number;
  readonly notebook: NotebookDocument;
  readonly kind: NotebookCellKind;
  readonly document: TextDocument;
  readonly metadata: { [key: string]: any; };
  readonly outputs: NotebookCellOutput[];
  readonly executionSummary?: NotebookCellExecutionSummary;
}

export enum NotebookCellKind {
  Markup = 1,
  Code = 2
}

export interface NotebookCellOutput {
  readonly id: string;
  readonly metadata?: { [key: string]: any; };
  readonly items: NotebookCellOutputItem[];
}

export interface NotebookCellOutputItem {
  readonly mime: string;
  readonly data: Uint8Array;
}

export interface NotebookCellExecutionSummary {
  readonly executionOrder?: number;
  readonly success?: boolean;
  readonly timing?: {
    readonly startTime: number;
    readonly endTime: number;
  };
}

export interface NotebookEditor {
  readonly notebook: NotebookDocument;
  readonly selection: NotebookRange;
  readonly selections: readonly NotebookRange[];
  readonly visibleRanges: readonly NotebookRange[];
  readonly viewColumn?: ViewColumn;
  revealRange(range: NotebookRange, revealType?: NotebookEditorRevealType): void;
}

export enum NotebookEditorRevealType {
  Default = 0,
  InCenter = 1,
  InCenterIfOutsideViewport = 2,
  AtTop = 3
}

export interface NotebookCellExecution {
  readonly cell: NotebookCell;
  readonly token: CancellationToken;
  readonly executionOrder: number | undefined;
  start(startTime?: number): void;
  end(success: boolean | undefined, endTime?: number): void;
  clearOutput(cell?: NotebookCell): Thenable<void>;
  replaceOutput(out: NotebookCellOutput | readonly NotebookCellOutput[], cell?: NotebookCell): Thenable<void>;
  appendOutput(out: NotebookCellOutput | readonly NotebookCellOutput[], cell?: NotebookCell): Thenable<void>;
  replaceOutputItems(items: NotebookCellOutputItem | readonly NotebookCellOutputItem[], output: NotebookCellOutput): Thenable<void>;
  appendOutputItems(items: NotebookCellOutputItem | readonly NotebookCellOutputItem[], output: NotebookCellOutput): Thenable<void>;
}

export interface NotebookCellStatusBarItem {
  readonly text: string;
  readonly alignment: NotebookCellStatusBarAlignment;
  readonly priority?: number;
  readonly accessibilityInformation?: AccessibilityInformation;
  readonly command?: string | Command;
  readonly tooltip?: string;
}

export enum NotebookCellStatusBarAlignment {
  Left = 1,
  Right = 2
}

export interface AuthenticationSessionAccountInformation {
  readonly id: string;
  readonly label: string;
}

export interface AuthenticationProviderAuthenticationSessionsChangeEvent {
  readonly added?: readonly AuthenticationSession[];
  readonly removed?: readonly AuthenticationSession[];
  readonly changed?: readonly AuthenticationSession[];
}

export interface TestItemCollection {
  readonly size: number;
  replace(items: readonly TestItem[]): void;
  forEach(callback: (item: TestItem, collection: TestItemCollection) => unknown, thisArg?: any): void;
  add(item: TestItem): void;
  delete(id: string): void;
  get(itemId: string): TestItem | undefined;
  [Symbol.iterator](): Iterator<TestItem>;
}

export interface TestRunProfile {
  readonly label: string;
  readonly kind: TestRunProfileKind;
  readonly isDefault: boolean;
  readonly tag: TestTag | undefined;
  loadDetailedCoverage?: (testRun: TestRun, fileCoverage: FileCoverage, token: CancellationToken) => Thenable<FileCoverageDetail[]>;
  runHandler: (request: TestRunRequest, token: CancellationToken) => void | Thenable<void>;
  dispose(): void;
}

export enum TestRunProfileKind {
  Run = 1,
  Debug = 2,
  Coverage = 3
}

export interface TestTag {
  readonly id: string;
}

export interface TestMessage {
  message: string | MarkdownString;
  expectedOutput?: string;
  actualOutput?: string;
  location?: Location;
  contextValue?: string;
}

export interface FileCoverage {
  readonly uri: Uri;
  readonly statementCoverage: TestCoverageCount;
  readonly branchCoverage?: TestCoverageCount;
  readonly declarationCoverage?: TestCoverageCount;
}

export interface FileCoverageDetail {
  readonly range: Range;
  readonly branches?: BranchCoverage[];
}

export interface TestCoverageCount {
  readonly covered: number;
  readonly total: number;
}

export interface BranchCoverage {
  readonly location?: Range;
  readonly label?: string;
  readonly executed: boolean;
}

export interface MarkdownStringTrustedOptions {
  readonly enabledCommands: readonly string[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  categories: PluginCategory[];
  main: string;
  icon?: string;
  displayName: string;
  publisher: string;
  engines: {
    primusIDE: string;
    node?: string;
  };
  activationEvents: ActivationEvent[];
  contributes: PluginContributions;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  extensionDependencies?: string[];
  extensionPack?: string[];
  scripts?: Record<string, string>;
  pricing: 'free' | 'premium' | 'subscription';
  marketplace: MarketplaceInfo;
  security: SecurityConfig;
  capabilities: PluginCapability[];
  permissions: PluginPermission[];
  metadata: PluginMetadata;
}

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
  avatar?: string;
}

export interface MarketplaceInfo {
  featured: boolean;
  verified: boolean;
  downloads: number;
  rating: number;
  reviews: number;
  lastUpdated: Date;
  publishedDate: Date;
  tags: string[];
  screenshots: string[];
  changelog?: string;
}

export interface SecurityConfig {
  sandbox: boolean;
  permissions: SecurityPermission[];
  trustedDomains: string[];
  csp?: string;
  allowedApis: string[];
  isolationLevel: 'none' | 'basic' | 'strict';
}

export interface SecurityPermission {
  type: 'filesystem' | 'network' | 'process' | 'system' | 'ui' | 'data';
  scope: string[];
  reason: string;
  required: boolean;
}

export type PluginCategory = 
  | 'editor' 
  | 'debugger' 
  | 'testing' 
  | 'themes' 
  | 'languages' 
  | 'snippets' 
  | 'formatters' 
  | 'linters' 
  | 'git' 
  | 'productivity' 
  | 'ai' 
  | 'collaboration' 
  | 'deployment' 
  | 'database' 
  | 'cloud' 
  | 'other';

export interface ActivationEvent {
  event: string;
  condition?: string;
  priority: number;
}

export interface PluginContributions {
  commands?: CommandContribution[];
  menus?: MenuContribution[];
  keybindings?: KeybindingContribution[];
  languages?: LanguageContribution[];
  themes?: ThemeContribution[];
  snippets?: SnippetContribution[];
  grammars?: GrammarContribution[];
  debuggers?: DebuggerContribution[];
  views?: ViewContribution[];
  viewContainers?: ViewContainerContribution[];
  problemMatchers?: ProblemMatcherContribution[];
  taskDefinitions?: TaskDefinitionContribution[];
  configuration?: ConfigurationContribution;
  fileAssociations?: FileAssociationContribution[];
  customEditors?: CustomEditorContribution[];
  notebooks?: NotebookContribution[];
  authentication?: AuthenticationContribution[];
  terminal?: TerminalContribution[];
  webviews?: WebviewContribution[];
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

export interface MenuContribution {
  commandPalette?: MenuItemContribution[];
  editor?: {
    context?: MenuItemContribution[];
    title?: MenuItemContribution[];
  };
  explorer?: {
    context?: MenuItemContribution[];
  };
  view?: {
    title?: MenuItemContribution[];
    item?: {
      context?: MenuItemContribution[];
    };
  };
}

export interface MenuItemContribution {
  command: string;
  when?: string;
  group?: string;
  alt?: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  when?: string;
  args?: any;
}

export interface LanguageContribution {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  filenamePatterns?: string[];
  mimetypes?: string[];
  firstLine?: string;
  configuration?: string;
}

export interface ThemeContribution {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  path: string;
}

export interface SnippetContribution {
  language: string;
  path: string;
}

export interface GrammarContribution {
  language: string;
  scopeName: string;
  path: string;
  embeddedLanguages?: Record<string, string>;
  tokenTypes?: Record<string, string>;
  injectTo?: string[];
}

export interface DebuggerContribution {
  type: string;
  label?: string;
  runtime?: string;
  program?: string;
  configurationAttributes?: Record<string, any>;
  initialConfigurations?: any[];
  configurationSnippets?: any[];
  variables?: Record<string, string>;
}

export interface ViewContribution {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
  visibility?: 'visible' | 'hidden' | 'collapsed';
}

export interface ViewContainerContribution {
  id: string;
  title: string;
  icon: string;
}

export interface ProblemMatcherContribution {
  name: string;
  label?: string;
  owner?: string;
  source?: string;
  applyTo?: 'allDocuments' | 'openDocuments' | 'closedDocuments';
  fileLocation?: string | string[];
  pattern?: ProblemPattern | ProblemPattern[];
  severity?: 'error' | 'warning' | 'info';
  watching?: WatchingPattern;
}

export interface ProblemPattern {
  regexp: string;
  file?: number;
  location?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message?: number;
  code?: number;
  severity?: number;
  loop?: boolean;
}

export interface WatchingPattern {
  activeOnStart?: boolean;
  beginsPattern?: string | WatchingMatcher;
  endsPattern?: string | WatchingMatcher;
}

export interface WatchingMatcher {
  regexp: string;
  file?: number;
}

export interface TaskDefinitionContribution {
  type: string;
  required?: string[];
  properties?: Record<string, any>;
}

export interface ConfigurationContribution {
  title?: string;
  properties?: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  description: string;
  enum?: any[];
  enumDescriptions?: string[];
  pattern?: string;
  patternErrorMessage?: string;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  minLength?: number;
  items?: ConfigurationProperty;
  properties?: Record<string, ConfigurationProperty>;
  additionalProperties?: boolean | ConfigurationProperty;
  scope?: 'application' | 'machine' | 'machine-overridable' | 'window' | 'resource' | 'language-overridable';
  order?: number;
  deprecationMessage?: string;
  markdownDescription?: string;
}

export interface FileAssociationContribution {
  fileMatch: string;
  scheme?: string;
  priority?: 'normal' | 'high' | 'builtin';
}

export interface CustomEditorContribution {
  viewType: string;
  displayName: string;
  selector: CustomEditorSelector[];
  priority?: 'default' | 'option';
}

export interface CustomEditorSelector {
  filenamePattern?: string;
  scheme?: string;
}

export interface NotebookContribution {
  type: string;
  displayName: string;
  selector?: NotebookSelector[];
  priority?: 'default' | 'option';
}

export interface NotebookSelector {
  filenamePattern?: string;
  excludeFileNamePattern?: string;
}

export interface AuthenticationContribution {
  id: string;
  label: string;
}

export interface TerminalContribution {
  profiles?: TerminalProfileContribution[];
}

export interface TerminalProfileContribution {
  id: string;
  title: string;
  icon?: string;
}

export interface WebviewContribution {
  viewType: string;
  displayName: string;
}

export interface PluginCapability {
  name: string;
  version: string;
  optional: boolean;
  description: string;
}

export interface PluginPermission {
  type: 'read' | 'write' | 'execute' | 'network' | 'system';
  resource: string;
  justification: string;
}

export interface PluginMetadata {
  installSize: number;
  lastModified: Date;
  checksum: string;
  signature?: string;
  certificateChain?: string[];
  deprecated?: boolean;
  deprecationMessage?: string;
  preRelease?: boolean;
  telemetry?: TelemetryConfig;
}

export interface TelemetryConfig {
  enabled: boolean;
  events: string[];
  privacyStatement?: string;
}

export interface PluginContext {
  extensionPath: string;
  extensionUri: string;
  globalStoragePath: string;
  workspaceStoragePath?: string;
  subscriptions: Disposable[];
  secrets: SecretStorage;
  globalState: Memento;
  workspaceState?: Memento;
  environmentVariableCollection: EnvironmentVariableCollection;
  asAbsolutePath(relativePath: string): string;
  storageUri?: string;
  globalStorageUri: string;
  logUri: string;
  extension: Extension<any>;
  logger: Logger;
}

export interface Disposable {
  dispose(): void;
}

export interface SecretStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  onDidChange: Event<SecretStorageChangeEvent>;
}

export interface SecretStorageChangeEvent {
  key: string;
}

export interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Promise<void>;
  keys(): readonly string[];
}

export interface EnvironmentVariableCollection {
  persistent: boolean;
  replace(variable: string, value: string): void;
  append(variable: string, value: string): void;
  prepend(variable: string, value: string): void;
  get(variable: string): EnvironmentVariableMutator | undefined;
  forEach(callback: (variable: string, mutator: EnvironmentVariableMutator, collection: EnvironmentVariableCollection) => any, thisArg?: any): void;
  delete(variable: string): void;
  clear(): void;
}

export interface EnvironmentVariableMutator {
  type: EnvironmentVariableMutatorType;
  value: string;
}

export type EnvironmentVariableMutatorType = 'replace' | 'append' | 'prepend';

export interface Logger {
  trace(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string | Error, ...args: any[]): void;
}

export interface PluginInstance {
  id: string;
  manifest: PluginManifest;
  context: PluginContext;
  module?: any;
  state: PluginState;
  activationTime?: number;
  deactivationTime?: number;
  errors: PluginError[];
  metrics: PluginMetrics;
  sandbox?: PluginSandbox;
  api: PluginAPI;
}

export type PluginState = 'inactive' | 'activating' | 'active' | 'deactivating' | 'error' | 'disabled';

export interface PluginError {
  type: 'activation' | 'runtime' | 'deactivation' | 'security' | 'api';
  message: string;
  stack?: string;
  timestamp: Date;
  context?: any;
}

export interface PluginMetrics {
  activationTime: number;
  memoryUsage: number;
  cpuUsage: number;
  apiCalls: number;
  eventsFired: number;
  errorsCount: number;
  lastActivity: Date;
}

export interface PluginSandbox {
  id: string;
  context: SandboxContext;
  permissions: Set<string>;
  restrictions: SandboxRestriction[];
  process?: NodeJS.Process;
  vm?: any;
}

export interface SandboxContext {
  globals: Record<string, any>;
  require: (id: string) => any;
  console: Console;
  process: Partial<NodeJS.Process>;
  Buffer: typeof Buffer;
  setTimeout: typeof setTimeout;
  setInterval: typeof setInterval;
  clearTimeout: typeof clearTimeout;
  clearInterval: typeof clearInterval;
}

export interface SandboxRestriction {
  type: 'api' | 'filesystem' | 'network' | 'process' | 'memory';
  rule: string;
  severity: 'warning' | 'error' | 'block';
}

export interface PluginAPI {
  commands: CommandsAPI;
  window: WindowAPI;
  workspace: WorkspaceAPI;
  languages: LanguagesAPI;
  debug: DebugAPI;
  tasks: TasksAPI;
  extensions: ExtensionsAPI;
  env: EnvAPI;
  ui: UIAPI;
  fs: FileSystemAPI;
  git: GitAPI;
  terminal: TerminalAPI;
  webview: WebviewAPI;
  notebook: NotebookAPI;
  authentication: AuthenticationAPI;
  test: TestAPI;
  l10n: LocalizationAPI;
}

export interface CommandsAPI {
  registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
  executeCommand<T = unknown>(command: string, ...rest: any[]): Promise<T>;
  getCommands(filterInternal?: boolean): Promise<string[]>;
}

export interface WindowAPI {
  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showQuickPick(items: string[] | Promise<string[]>, options?: QuickPickOptions): Promise<string | undefined>;
  showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
  createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;
  createOutputChannel(name: string, languageId?: string): OutputChannel;
  createWebviewPanel(viewType: string, title: string, showOptions: ViewColumn | { viewColumn: ViewColumn; preserveFocus?: boolean }, options?: WebviewPanelOptions & WebviewOptions): WebviewPanel;
  registerCustomEditorProvider(viewType: string, provider: CustomTextEditorProvider | CustomReadonlyEditorProvider, options?: { webviewOptions?: WebviewPanelOptions; supportsMultipleEditorsPerDocument?: boolean }): Disposable;
  activeTextEditor?: TextEditor;
  visibleTextEditors: TextEditor[];
  onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
  onDidChangeVisibleTextEditors: Event<TextEditor[]>;
  onDidChangeTextEditorSelection: Event<TextEditorSelectionChangeEvent>;
  onDidChangeTextEditorVisibleRanges: Event<TextEditorVisibleRangesChangeEvent>;
  onDidChangeTextEditorOptions: Event<TextEditorOptionsChangeEvent>;
  onDidChangeTextEditorViewColumn: Event<TextEditorViewColumnChangeEvent>;
}

export interface WorkspaceAPI {
  rootPath?: string;
  workspaceFolders?: readonly WorkspaceFolder[];
  name?: string;
  getConfiguration(section?: string, scope?: ConfigurationScope): WorkspaceConfiguration;
  onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
  onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
  findFiles(include: GlobPattern, exclude?: GlobPattern | null, maxResults?: number, token?: CancellationToken): Promise<Uri[]>;
  saveAll(includeUntitled?: boolean): Promise<boolean>;
  applyEdit(edit: WorkspaceEdit): Promise<boolean>;
  createFileSystemWatcher(globPattern: GlobPattern, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean): FileSystemWatcher;
  asRelativePath(pathOrUri: string | Uri, includeWorkspaceFolder?: boolean): string;
  updateWorkspaceFolders(start: number, deleteCount: number | undefined | null, ...workspaceFoldersToAdd: { uri: Uri; name?: string }[]): boolean;
  openTextDocument(uri: Uri): Promise<TextDocument>;
  openTextDocument(fileName: string): Promise<TextDocument>;
  openTextDocument(options?: { language?: string; content?: string }): Promise<TextDocument>;
  registerTextDocumentContentProvider(scheme: string, provider: TextDocumentContentProvider): Disposable;
}

export interface LanguagesAPI {
  getLanguages(): Promise<string[]>;
  setTextDocumentLanguage(document: TextDocument, languageId: string): Promise<TextDocument>;
  match(selector: DocumentSelector, document: TextDocument): number;
  registerCodeActionsProvider(selector: DocumentSelector, provider: CodeActionProvider, metadata?: CodeActionProviderMetadata): Disposable;
  registerCodeLensProvider(selector: DocumentSelector, provider: CodeLensProvider): Disposable;
  registerDefinitionProvider(selector: DocumentSelector, provider: DefinitionProvider): Disposable;
  registerImplementationProvider(selector: DocumentSelector, provider: ImplementationProvider): Disposable;
  registerTypeDefinitionProvider(selector: DocumentSelector, provider: TypeDefinitionProvider): Disposable;
  registerHoverProvider(selector: DocumentSelector, provider: HoverProvider): Disposable;
  registerDocumentHighlightProvider(selector: DocumentSelector, provider: DocumentHighlightProvider): Disposable;
  registerDocumentSymbolProvider(selector: DocumentSelector, provider: DocumentSymbolProvider, metadata?: DocumentSymbolProviderMetadata): Disposable;
  registerWorkspaceSymbolProvider(provider: WorkspaceSymbolProvider): Disposable;
  registerReferenceProvider(selector: DocumentSelector, provider: ReferenceProvider): Disposable;
  registerRenameProvider(selector: DocumentSelector, provider: RenameProvider): Disposable;
  registerDocumentFormattingEditProvider(selector: DocumentSelector, provider: DocumentFormattingEditProvider): Disposable;
  registerDocumentRangeFormattingEditProvider(selector: DocumentSelector, provider: DocumentRangeFormattingEditProvider): Disposable;
  registerOnTypeFormattingEditProvider(selector: DocumentSelector, provider: OnTypeFormattingEditProvider, firstTriggerCharacter: string, ...moreTriggerCharacter: string[]): Disposable;
  registerSignatureHelpProvider(selector: DocumentSelector, provider: SignatureHelpProvider, ...triggerCharacters: string[]): Disposable;
  registerCompletionItemProvider(selector: DocumentSelector, provider: CompletionItemProvider, ...triggerCharacters: string[]): Disposable;
  registerDocumentLinkProvider(selector: DocumentSelector, provider: DocumentLinkProvider): Disposable;
  registerColorProvider(selector: DocumentSelector, provider: DocumentColorProvider): Disposable;
  registerFoldingRangeProvider(selector: DocumentSelector, provider: FoldingRangeProvider): Disposable;
  registerSelectionRangeProvider(selector: DocumentSelector, provider: SelectionRangeProvider): Disposable;
  registerCallHierarchyProvider(selector: DocumentSelector, provider: CallHierarchyProvider): Disposable;
  registerDocumentSemanticTokensProvider(selector: DocumentSelector, provider: DocumentSemanticTokensProvider, legend: SemanticTokensLegend): Disposable;
  registerDocumentRangeSemanticTokensProvider(selector: DocumentSelector, provider: DocumentRangeSemanticTokensProvider, legend: SemanticTokensLegend): Disposable;
}

// Additional API interfaces
export interface UIAPI {
  showMessage(message: string, type: 'info' | 'warning' | 'error'): Promise<void>;
  showProgress<T>(title: string, task: (progress: ProgressReporter<any>) => Promise<T>): Promise<T>;
  createTreeView<T>(viewId: string, options: TreeViewOptions<T>): TreeView<T>;
  createQuickPick<T extends QuickPickItem>(): QuickPick<T>;
  createInputBox(): InputBox;
}

export interface FileSystemAPI {
  readFile(uri: Uri): Promise<Uint8Array>;
  writeFile(uri: Uri, content: Uint8Array): Promise<void>;
  delete(uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }): Promise<void>;
  rename(source: Uri, target: Uri, options?: { overwrite?: boolean }): Promise<void>;
  copy(source: Uri, target: Uri, options?: { overwrite?: boolean }): Promise<void>;
  createDirectory(uri: Uri): Promise<void>;
  readDirectory(uri: Uri): Promise<[string, FileType][]>;
  stat(uri: Uri): Promise<FileStat>;
  watch(resource: Uri, options?: { recursive?: boolean; excludes?: string[] }): Disposable;
}

export interface GitAPI {
  getRepository(uri: Uri): Repository | null;
  getRepositories(): Repository[];
  openRepository(root: Uri): Promise<Repository>;
  init(root: Uri): Promise<Repository>;
  clone(url: string, parentPath: string, options?: CloneOptions): Promise<Repository>;
}

export interface TerminalAPI {
  createTerminal(options?: TerminalOptions): Terminal;
  sendText(text: string, addNewLine?: boolean): void;
  show(preserveFocus?: boolean): void;
  hide(): void;
  dispose(): void;
  processId: Promise<number | undefined>;
  creationOptions: Readonly<TerminalOptions>;
  name: string;
  exitStatus: TerminalExitStatus | undefined;
}

export interface WebviewAPI {
  createWebview(options: WebviewOptions): Webview;
  createWebviewPanel(viewType: string, title: string, showOptions: ViewColumn | WebviewPanelShowOptions, options?: WebviewPanelOptions & WebviewOptions): WebviewPanel;
  registerWebviewPanelSerializer<T = any>(viewType: string, serializer: WebviewPanelSerializer<T>): Disposable;
}

export interface NotebookAPI {
  createNotebookController(id: string, notebookType: string, label: string, handler?: NotebookExecuteHandler, rendererScripts?: NotebookRendererScript[]): NotebookController;
  registerNotebookCellStatusBarItemProvider(notebookType: string, provider: NotebookCellStatusBarItemProvider): Disposable;
  createRendererMessaging(rendererId: string): NotebookRendererMessaging;
}

export interface AuthenticationAPI {
  getSession(providerId: string, scopes: readonly string[], options?: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined>;
  getSessions(providerId: string, scopes?: readonly string[]): Promise<readonly AuthenticationSession[]>;
  createProvider(id: string, label: string, provider: AuthenticationProvider, options?: AuthenticationProviderOptions): Disposable;
  registerAuthenticationProvider(id: string, label: string, provider: AuthenticationProvider, options?: AuthenticationProviderOptions): Disposable;
}

export interface TestAPI {
  createTestController(id: string, label: string): TestController;
  createTestItem(id: string, label: string, uri?: Uri): TestItem;
  createTestRun(request: TestRunRequest, name?: string, persist?: boolean): TestRun;
}

export interface LocalizationAPI {
  t(message: string, ...args: Array<string | number | boolean>): string;
  t(message: string, args: Record<string, any>): string;
  t(options: { message: string; args?: Array<string | number | boolean> | Record<string, any>; comment?: string | string[] }): string;
  bundle: { [key: string]: string };
  uri?: Uri;
}

// Supporting interfaces for API types
export interface QuickPickOptions {
  title?: string;
  canSelectMany?: boolean;
  ignoreFocusOut?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
  placeHolder?: string;
  onDidSelectItem?(item: QuickPickItem | string): any;
}

export interface InputBoxOptions {
  title?: string;
  value?: string;
  valueSelection?: [number, number];
  prompt?: string;
  placeHolder?: string;
  password?: boolean;
  ignoreFocusOut?: boolean;
  validateInput?(value: string): string | undefined | null | Promise<string | undefined | null>;
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2
}

export interface StatusBarItem {
  alignment: StatusBarAlignment;
  priority?: number;
  text: string;
  tooltip?: string | MarkdownString;
  color?: string | ThemeColor;
  backgroundColor?: ThemeColor;
  command?: string | Command;
  accessibilityInformation?: AccessibilityInformation;
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface OutputChannel {
  name: string;
  append(value: string): void;
  appendLine(value: string): void;
  replace(value: string): void;
  clear(): void;
  show(preserveFocus?: boolean): void;
  show(column?: ViewColumn, preserveFocus?: boolean): void;
  hide(): void;
  dispose(): void;
}

export interface CustomTextEditorProvider {
  resolveCustomTextEditor(document: TextDocument, webviewPanel: WebviewPanel, token: CancellationToken): Disposable | Promise<Disposable>;
}

export interface CustomReadonlyEditorProvider<T = CustomDocument> {
  openCustomDocument(uri: Uri, openContext: CustomDocumentOpenContext, token: CancellationToken): Disposable | Promise<T>;
  resolveCustomEditor(document: T, webviewPanel: WebviewPanel, token: CancellationToken): Disposable | Promise<Disposable>;
}

// Additional supporting interfaces
export interface Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;
  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri;
  toString(skipEncoding?: boolean): string;
  toJSON(): UriComponents;
}

export interface UriComponents {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
}

export interface TextDocument {
  readonly uri: Uri;
  readonly fileName: string;
  readonly isUntitled: boolean;
  readonly languageId: string;
  readonly version: number;
  readonly isDirty: boolean;
  readonly isClosed: boolean;
  save(): Promise<boolean>;
  readonly eol: EndOfLine;
  readonly lineCount: number;
  lineAt(line: number): TextLine;
  lineAt(position: Position): TextLine;
  offsetAt(position: Position): number;
  positionAt(offset: number): Position;
  getText(range?: Range): string;
  getWordRangeAtPosition(position: Position, regex?: RegExp): Range | undefined;
  validateRange(range: Range): Range;
  validatePosition(position: Position): Position;
}

export interface WorkspaceFolder {
  readonly uri: Uri;
  readonly name: string;
  readonly index: number;
}

export interface WorkspaceConfiguration {
  get<T>(section: string): T | undefined;
  get<T>(section: string, defaultValue: T): T;
  has(section: string): boolean;
  inspect<T>(section: string): { key: string; defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T; defaultLanguageValue?: T; globalLanguageValue?: T; workspaceLanguageValue?: T; workspaceFolderLanguageValue?: T; languageIds?: string[] } | undefined;
  update(section: string, value: any, configurationTarget?: ConfigurationTarget | boolean | null, overrideInLanguage?: boolean): Promise<void>;
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3
}

export type ConfigurationScope = Uri | TextDocument | WorkspaceFolder | { uri?: Uri; languageId: string };

export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string, scope?: ConfigurationScope): boolean;
}

export interface WorkspaceFoldersChangeEvent {
  readonly added: readonly WorkspaceFolder[];
  readonly removed: readonly WorkspaceFolder[];
}

export type GlobPattern = string | RelativePattern;

export interface RelativePattern {
  base: string;
  pattern: string;
}

export interface WorkspaceEdit {
  size: number;
  replace(uri: Uri, range: Range, newText: string): void;
  insert(uri: Uri, position: Position, newText: string): void;
  delete(uri: Uri, range: Range): void;
  has(uri: Uri): boolean;
  set(uri: Uri, edits: TextEdit[]): void;
  get(uri: Uri): TextEdit[];
  createFile(uri: Uri, options?: { overwrite?: boolean; ignoreIfExists?: boolean }, metadata?: WorkspaceEditEntryMetadata): void;
  deleteFile(uri: Uri, options?: { recursive?: boolean; ignoreIfNotExists?: boolean }, metadata?: WorkspaceEditEntryMetadata): void;
  renameFile(oldUri: Uri, newUri: Uri, options?: { overwrite?: boolean; ignoreIfExists?: boolean }, metadata?: WorkspaceEditEntryMetadata): void;
  entries(): [Uri, TextEdit[]][];
}

export interface FileSystemWatcher extends Disposable {
  ignoreCreateEvents: boolean;
  ignoreChangeEvents: boolean;
  ignoreDeleteEvents: boolean;
  onDidCreate: Event<Uri>;
  onDidChange: Event<Uri>;
  onDidDelete: Event<Uri>;
}

// Continuing with DebugAPI...
export interface DebugAPI {
  activeDebugSession?: DebugSession;
  activeDebugConsole: DebugConsole;
  breakpoints: Breakpoint[];
  onDidChangeActiveDebugSession: Event<DebugSession | undefined>;
  onDidStartDebugSession: Event<DebugSession>;
  onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent>;
  onDidTerminateDebugSession: Event<DebugSession>;
  onDidChangeBreakpoints: Event<BreakpointsChangeEvent>;
  registerDebugConfigurationProvider(debugType: string, provider: DebugConfigurationProvider, triggerKind?: DebugConfigurationProviderTriggerKind): Disposable;
  registerDebugAdapterDescriptorFactory(debugType: string, factory: DebugAdapterDescriptorFactory): Disposable;
  registerDebugAdapterTrackerFactory(debugType: string, factory: DebugAdapterTrackerFactory): Disposable;
  startDebugging(folder: WorkspaceFolder | undefined, nameOrConfiguration: string | DebugConfiguration, parentSessionOrOptions?: DebugSession | DebugSessionOptions): Promise<boolean>;
  stopDebugging(session?: DebugSession): Promise<void>;
  addBreakpoints(breakpoints: Breakpoint[]): void;
  removeBreakpoints(breakpoints: Breakpoint[]): void;
}

// Additional missing type definitions for Debug API
export interface DebugSession {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly workspaceFolder: WorkspaceFolder | undefined;
  readonly configuration: DebugConfiguration;
  customRequest(command: string, args?: any): Promise<any>;
  getDebugProtocolBreakpoint(breakpoint: Breakpoint): Promise<DebugProtocolBreakpoint | undefined>;
}

export interface DebugConsole {
  append(value: string): void;
  appendLine(value: string): void;
}

export interface Breakpoint {
  readonly id: string;
  readonly enabled: boolean;
  readonly condition?: string;
  readonly hitCondition?: string;
  readonly logMessage?: string;
}

export interface DebugSessionCustomEvent {
  readonly session: DebugSession;
  readonly event: string;
  readonly body?: any;
}

export interface BreakpointsChangeEvent {
  readonly added: readonly Breakpoint[];
  readonly removed: readonly Breakpoint[];
  readonly changed: readonly Breakpoint[];
}

export interface DebugConfiguration {
  readonly type: string;
  readonly name: string;
  readonly request: string;
  [key: string]: any;
}

export interface DebugConfigurationProvider {
  provideDebugConfigurations?(folder: WorkspaceFolder | undefined, token?: CancellationToken): Promise<DebugConfiguration[]>;
  resolveDebugConfiguration?(folder: WorkspaceFolder | undefined, debugConfiguration: DebugConfiguration, token?: CancellationToken): Promise<DebugConfiguration | undefined | null>;
  resolveDebugConfigurationWithSubstitutedVariables?(folder: WorkspaceFolder | undefined, debugConfiguration: DebugConfiguration, token?: CancellationToken): Promise<DebugConfiguration | undefined | null>;
}

export enum DebugConfigurationProviderTriggerKind {
  Initial = 1,
  Dynamic = 2
}

export interface DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(session: DebugSession, executable: DebugAdapterExecutable | undefined): Promise<DebugAdapterDescriptor>;
}

export interface DebugAdapterTrackerFactory {
  createDebugAdapterTracker(session: DebugSession): Promise<DebugAdapterTracker>;
}

export interface DebugSessionOptions {
  readonly parentSession?: DebugSession;
  readonly lifecycleManagedByParent?: boolean;
  readonly consoleMode?: DebugConsoleMode;
  readonly noDebug?: boolean;
  readonly compact?: boolean;
}

export interface DebugProtocolBreakpoint {
  readonly id?: number;
  readonly verified: boolean;
  readonly message?: string;
  readonly source?: DebugProtocolSource;
  readonly line?: number;
  readonly column?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface DebugAdapterDescriptor {}

export interface DebugAdapterExecutable {
  readonly command: string;
  readonly args: string[];
  readonly options?: DebugAdapterExecutableOptions;
}

export interface DebugAdapterExecutableOptions {
  readonly cwd?: string;
  readonly env?: { [key: string]: string };
}

export interface DebugAdapterTracker {
  onWillStartSession?(): void;
  onWillReceiveMessage?(message: any): void;
  onDidSendMessage?(message: any): void;
  onWillStopSession?(): void;
  onError?(error: Error): void;
  onExit?(code: number | undefined, signal: string | undefined): void;
}

export enum DebugConsoleMode {
  Separate = 0,
  MergeWithParent = 1
}

export interface DebugProtocolSource {
  readonly name?: string;
  readonly path?: string;
  readonly sourceReference?: number;
}

// Task API type definitions
export interface Task {
  readonly definition: TaskDefinition;
  readonly scope?: TaskScope;
  name: string;
  detail?: string;
  execution?: ProcessExecution | ShellExecution | CustomExecution;
  isBackground: boolean;
  source: string;
  group?: TaskGroup;
  presentationOptions?: TaskPresentationOptions;
  problemMatchers: string[];
  runOptions: RunOptions;
}

export interface TaskDefinition {
  readonly type: string;
  [name: string]: any;
}

export type TaskScope = number | WorkspaceFolder;

export namespace TaskScope {
  export const Global = 1;
  export const Workspace = 2;
}

export interface ProcessExecution {
  process: string;
  args: string[];
  options?: ProcessExecutionOptions;
}

export interface ShellExecution {
  commandLine: string;
  command?: string | ShellQuoting;
  args?: Array<string | ShellQuoting>;
  options?: ShellExecutionOptions;
}

export interface CustomExecution {
  callback: (resolvedDefinition: TaskDefinition) => Promise<Pseudoterminal>;
}

export interface ProcessExecutionOptions {
  cwd?: string;
  env?: { [key: string]: string };
}

export interface ShellExecutionOptions {
  executable?: string;
  shellArgs?: string[];
  shellQuoting?: ShellQuotingOptions;
  cwd?: string;
  env?: { [key: string]: string };
}

export interface ShellQuoting {
  value: string;
  quoting: ShellQuotingOptions;
}

export enum ShellQuotingOptions {
  Escape = 1,
  Strong = 2,
  Weak = 3
}

export interface TaskGroup {
  readonly isDefault?: boolean;
}

export namespace TaskGroup {
  export const Clean = { isDefault: false };
  export const Build = { isDefault: false };
  export const Rebuild = { isDefault: false };
  export const Test = { isDefault: false };
}

export interface TaskPresentationOptions {
  reveal?: TaskRevealKind;
  echo?: boolean;
  focus?: boolean;
  panel?: TaskPanelKind;
  showReuseMessage?: boolean;
  clear?: boolean;
  group?: string;
  close?: boolean;
}

export enum TaskRevealKind {
  Always = 1,
  Silent = 2,
  Never = 3
}

export enum TaskPanelKind {
  Shared = 1,
  Dedicated = 2,
  New = 3
}

export interface RunOptions {
  reevaluateOnRerun?: boolean;
}

export interface TaskProvider<T = Task> {
  provideTasks(token?: CancellationToken): Promise<T[]>;
  resolveTask(task: T, token?: CancellationToken): Promise<T | undefined>;
}

export interface TaskFilter {
  version?: string;
  type?: string;
}

export interface TaskExecution {
  readonly task: Task;
  readonly terminal?: Terminal;
  terminate(): void;
}

export interface TaskStartEvent {
  readonly execution: TaskExecution;
}

export interface TaskEndEvent {
  readonly execution: TaskExecution;
}

export interface TaskProcessStartEvent {
  readonly execution: TaskExecution;
  readonly processId: number;
}

export interface TaskProcessEndEvent {
  readonly execution: TaskExecution;
  readonly exitCode: number | undefined;
}

export interface Pseudoterminal {
  onDidWrite: Event<string>;
  onDidOverrideDimensions?: Event<TerminalDimensions | undefined>;
  onDidClose?: Event<number | void>;
  onDidChangeName?: Event<string>;
  open(initialDimensions: TerminalDimensions | undefined): void;
  close(): void;
  handleInput?(data: string): void;
  setDimensions?(dimensions: TerminalDimensions): void;
}

export interface TerminalDimensions {
  readonly columns: number;
  readonly rows: number;
}

export interface Terminal {
  readonly name: string;
  readonly processId: Promise<number | undefined>;
  readonly creationOptions: Readonly<TerminalOptions>;
  readonly exitStatus: TerminalExitStatus | undefined;
  sendText(text: string, addNewLine?: boolean): void;
  show(preserveFocus?: boolean): void;
  hide(): void;
  dispose(): void;
}

export interface TerminalOptions {
  name?: string;
  shellPath?: string;
  shellArgs?: string[] | string;
  cwd?: string | Uri;
  env?: { [key: string]: string | null | undefined };
  strictEnv?: boolean;
  hideFromUser?: boolean;
  message?: string;
  iconPath?: Uri | { light: Uri; dark: Uri } | ThemeIcon;
  color?: ThemeColor;
  pty?: Pseudoterminal;
}

export interface TerminalExitStatus {
  readonly code: number | undefined;
  readonly reason: TerminalExitReason;
}

export enum TerminalExitReason {
  Unknown = 0,
  Shutdown = 1,
  Process = 2,
  User = 3,
  Extension = 4
}

// Additional utility type definitions
export interface Clipboard {
  readText(): Promise<string>;
  writeText(value: string): Promise<void>;
}

export enum LogLevel {
  Trace = 1,
  Debug = 2,
  Info = 3,
  Warning = 4,
  Error = 5,
  Critical = 6,
  Off = 7
}

export interface TelemetryLogger {
  readonly isUsageEnabled: boolean;
  readonly isErrorsEnabled: boolean;
  logUsage(eventName: string, data?: Record<string, any>): void;
  logError(eventName: string, data?: Record<string, any>): void;
  logError(error: Error, data?: Record<string, any>): void;
  dispose(): void;
}

export interface TelemetrySender {
  sendEventData(eventName: string, data?: Record<string, any>): void;
  sendErrorData(error: Error, data?: Record<string, any>): void;
  flush?(): void | Promise<void>;
}

export interface TelemetryLoggerOptions {
  readonly ignoreBuiltInCommonProperties?: boolean;
  readonly ignoreUnhandledErrors?: boolean;
  readonly additionalCommonProperties?: Record<string, any>;
}

export interface TasksAPI {
  registerTaskProvider(type: string, provider: TaskProvider): Disposable;
  fetchTasks(filter?: TaskFilter): Promise<Task[]>;
  executeTask(task: Task): Promise<TaskExecution>;
  taskExecutions: readonly TaskExecution[];
  onDidStartTask: Event<TaskStartEvent>;
  onDidEndTask: Event<TaskEndEvent>;
  onDidStartTaskProcess: Event<TaskProcessStartEvent>;
  onDidEndTaskProcess: Event<TaskProcessEndEvent>;
}

export interface ExtensionsAPI {
  getExtension<T = any>(extensionId: string): Extension<T> | undefined;
  getExtension<T = any>(extensionId: string): Extension<T> | undefined;
  all: readonly Extension<any>[];
  onDidChange: Event<void>;
}

export interface EnvAPI {
  appName: string;
  appRoot: string;
  language: string;
  clipboard: Clipboard;
  machineId: string;
  sessionId: string;
  remoteName?: string;
  shell: string;
  uriScheme: string;
  logLevel: LogLevel;
  onDidChangeLogLevel: Event<LogLevel>;
  createTelemetryLogger(sender: TelemetrySender, options?: TelemetryLoggerOptions): TelemetryLogger;
  isTelemetryEnabled: boolean;
  onDidChangeTelemetryEnabled: Event<boolean>;
  openExternal(target: Uri): Promise<boolean>;
  asExternalUri(target: Uri): Promise<Uri>;
}

export class PluginArchitectureSystem extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private registry!: PluginRegistry;
  private loader!: PluginLoader;
  private sandboxManager!: SandboxManager;
  private apiProvider!: APIProvider;
  private securityManager!: SecurityManager;
  private lifecycleManager!: LifecycleManager;
  private marketplace!: MarketplaceManager;
  private permissionManager!: PermissionManager;
  
  private isInitialized = false;
  private pluginDirectories: string[] = [];
  private configuration: PluginSystemConfiguration;

  constructor(config?: Partial<PluginSystemConfiguration>) {
    super();
    
    this.configuration = {
      pluginDirectory: path.join(process.cwd(), 'plugins'),
      sandboxEnabled: true,
      securityLevel: 'strict',
      maxPlugins: 100,
      maxMemoryPerPlugin: 128 * 1024 * 1024, // 128MB
      enableMarketplace: true,
      allowUnsignedPlugins: false,
      telemetryEnabled: true,
      autoUpdate: false,
      parallelActivation: true,
      activationTimeout: 30000,
      ...config
    };

    this.initializeManagers();
  }

  /**
   * Initialize plugin system managers
   */
  private initializeManagers(): void {
    
    this.registry = new PluginRegistry(this.configuration);
    this.loader = new PluginLoader(this.configuration);
    this.sandboxManager = new SandboxManager(this.configuration);
    this.apiProvider = new APIProvider(this);
    this.securityManager = new SecurityManager(this.configuration);
    this.lifecycleManager = new LifecycleManager(this);
    this.marketplace = new MarketplaceManager(this.configuration);
    this.permissionManager = new PermissionManager(this.configuration);

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.registry.on('plugin-registered', (plugin: PluginInstance) => {
      this.emit('plugin-registered', plugin);
    });

    this.registry.on('plugin-unregistered', (pluginId: string) => {
      this.emit('plugin-unregistered', pluginId);
    });

    this.lifecycleManager.on('plugin-activated', (plugin: PluginInstance) => {
      this.emit('plugin-activated', plugin);
    });

    this.lifecycleManager.on('plugin-deactivated', (plugin: PluginInstance) => {
      this.emit('plugin-deactivated', plugin);
    });

    this.lifecycleManager.on('plugin-error', (plugin: PluginInstance, error: PluginError) => {
      this.emit('plugin-error', plugin, error);
    });

    this.marketplace.on('plugin-downloaded', (pluginId: string) => {
      this.emit('plugin-downloaded', pluginId);
    });

    this.marketplace.on('plugin-updated', (pluginId: string) => {
      this.emit('plugin-updated', pluginId);
    });
  }

  /**
   * Initialize the plugin system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      
      return;
    }

    try {
      
      // Initialize managers
      await this.registry.initialize();
      await this.loader.initialize();
      await this.sandboxManager.initialize();
      await this.securityManager.initialize();
      await this.marketplace.initialize();

      // Discover plugins
      await this.discoverPlugins();

      // Load enabled plugins
      await this.loadEnabledPlugins();

      this.isInitialized = true;
      
      this.emit('system-initialized');

    } catch (error) {
      console.error('❌ Failed to initialize plugin system:', error);
      throw error;
    }
  }

  /**
   * Discover plugins in configured directories
   */
  async discoverPlugins(): Promise<PluginManifest[]> {
    
    const discoveredPlugins: PluginManifest[] = [];
    const directories = [
      this.configuration.pluginDirectory,
      ...this.pluginDirectories
    ];

    for (const directory of directories) {
      try {
        const plugins = await this.discoverPluginsInDirectory(directory);
        discoveredPlugins.push(...plugins);
      } catch (error) {
        console.warn(`⚠️ Failed to discover plugins in ${directory}:`, error);
      }
    }

    // Register discovered plugins
    for (const manifest of discoveredPlugins) {
      await this.registry.register(manifest);
    }

    this.emit('plugins-discovered', discoveredPlugins);

    return discoveredPlugins;
  }

  /**
   * Discover plugins in a specific directory
   */
  private async discoverPluginsInDirectory(directory: string): Promise<PluginManifest[]> {
    const plugins: PluginManifest[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(directory, entry.name);
          const manifestPath = path.join(pluginPath, 'package.json');

          try {
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent) as PluginManifest;

            // Validate manifest
            if (this.validateManifest(manifest)) {
              manifest.metadata = {
                ...manifest.metadata,
                installSize: await this.calculatePluginSize(pluginPath),
                lastModified: new Date(),
                checksum: await this.calculateChecksum(pluginPath)
              };

              plugins.push(manifest);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to read manifest for ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to read directory ${directory}:`, error);
    }

    return plugins;
  }

  /**
   * Load enabled plugins
   */
  private async loadEnabledPlugins(): Promise<void> {
    
    const enabledPlugins = await this.registry.getEnabledPlugins();
    const loadPromises: Promise<PluginInstance>[] = [];

    for (const manifest of enabledPlugins) {
      if (this.configuration.parallelActivation) {
        loadPromises.push(this.loadPlugin(manifest.id));
      } else {
        await this.loadPlugin(manifest.id);
      }
    }

    if (this.configuration.parallelActivation && loadPromises.length > 0) {
      await Promise.allSettled(loadPromises.map(p => p.then(() => void 0)));
    }

  }

  /**
   * Load a specific plugin
   */
  async loadPlugin(pluginId: string): Promise<PluginInstance> {
    
    const manifest = await this.registry.getPlugin(pluginId);
    if (!manifest) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Check if already loaded
    const existingInstance = this.plugins.get(pluginId);
    if (existingInstance) {
      
      return existingInstance;
    }

    try {
      // Security validation
      await this.securityManager.validatePlugin(manifest);

      // Permission check
      await this.permissionManager.checkPermissions(manifest);

      // Create plugin context
      const context = await this.createPluginContext(manifest);

      // Load plugin module
      const module = await this.loader.loadPlugin(manifest, context);

      // Create sandbox if required
      const sandbox = manifest.security.sandbox 
        ? await this.sandboxManager.createSandbox(manifest)
        : undefined;

      // Create plugin instance
      const instance: PluginInstance = {
        id: pluginId,
        manifest,
        context,
        module,
        state: 'inactive',
        errors: [],
        metrics: {
          activationTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          apiCalls: 0,
          eventsFired: 0,
          errorsCount: 0,
          lastActivity: new Date()
        },
        sandbox,
        api: this.apiProvider.createAPI(manifest, context)
      };

      this.plugins.set(pluginId, instance);

      // Activate plugin
      await this.lifecycleManager.activate(instance);

      this.emit('plugin-loaded', instance);

      return instance;

    } catch (error) {
      console.error(`❌ Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      
      return;
    }

    try {
      // Deactivate plugin
      await this.lifecycleManager.deactivate(instance);

      // Cleanup sandbox
      if (instance.sandbox) {
        await this.sandboxManager.destroySandbox(instance.sandbox);
      }

      // Cleanup context
      await this.cleanupPluginContext(instance.context);

      // Remove from loaded plugins
      this.plugins.delete(pluginId);

      this.emit('plugin-unloaded', instance);

    } catch (error) {
      console.error(`❌ Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Install plugin from marketplace
   */
  async installPlugin(pluginId: string, version?: string): Promise<void> {
    
    try {
      // Download from marketplace
      const packagePath = await this.marketplace.downloadPlugin(pluginId, version);

      // Extract and validate
      const manifest = await this.extractAndValidatePlugin(packagePath);

      // Security scan
      await this.securityManager.scanPlugin(manifest);

      // Install to plugin directory
      await this.installPluginToDirectory(manifest, packagePath);

      // Register plugin
      await this.registry.register(manifest);

      this.emit('plugin-installed', manifest);

    } catch (error) {
      console.error(`❌ Failed to install plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    
    try {
      // Unload if loaded
      if (this.plugins.has(pluginId)) {
        await this.unloadPlugin(pluginId);
      }

      // Remove from filesystem
      await this.removePluginFromFilesystem(pluginId);

      // Unregister
      await this.registry.unregister(pluginId);

      this.emit('plugin-uninstalled', pluginId);

    } catch (error) {
      console.error(`❌ Failed to uninstall plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Enable plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    await this.registry.setEnabled(pluginId, true);
    
    // Load if not already loaded
    if (!this.plugins.has(pluginId)) {
      await this.loadPlugin(pluginId);
    }

    this.emit('plugin-enabled', pluginId);
  }

  /**
   * Disable plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    await this.registry.setEnabled(pluginId, false);
    
    // Unload if loaded
    if (this.plugins.has(pluginId)) {
      await this.unloadPlugin(pluginId);
    }

    this.emit('plugin-disabled', pluginId);
  }

  /**
   * Get plugin instance
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin statistics
   */
  getStatistics(): PluginSystemStatistics {
    const totalPlugins = this.plugins.size;
    const activePlugins = Array.from(this.plugins.values())
      .filter(p => p.state === 'active').length;
    const totalMemory = Array.from(this.plugins.values())
      .reduce((sum, p) => sum + p.metrics.memoryUsage, 0);
    const totalErrors = Array.from(this.plugins.values())
      .reduce((sum, p) => sum + p.errors.length, 0);

    return {
      totalPlugins,
      activePlugins,
      inactivePlugins: totalPlugins - activePlugins,
      totalMemoryUsage: totalMemory,
      totalErrors,
      averageActivationTime: this.calculateAverageActivationTime(),
      systemUptime: Date.now() - this.getSystemStartTime()
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(updates: Partial<PluginSystemConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates };
    this.emit('configuration-updated', this.configuration);
  }

  /**
   * Shutdown plugin system
   */
  async shutdown(): Promise<void> {
    
    // Deactivate all plugins
    const shutdownPromises = Array.from(this.plugins.values())
      .map(plugin => this.unloadPlugin(plugin.id));

    await Promise.allSettled(shutdownPromises);

    // Cleanup managers
    await this.sandboxManager.cleanup();
    await this.securityManager.cleanup();
    await this.marketplace.cleanup();

    this.isInitialized = false;
    
    this.emit('system-shutdown');
  }

  // Helper methods
  private validateManifest(manifest: any): boolean {
    // Basic manifest validation
    return !!(
      manifest.id &&
      manifest.name &&
      manifest.version &&
      manifest.main &&
      manifest.engines?.primusIDE
    );
  }

  private async calculatePluginSize(pluginPath: string): Promise<number> {
    // Mock implementation - calculate directory size
    return 1024 * 1024; // 1MB placeholder
  }

  private async calculateChecksum(pluginPath: string): Promise<string> {
    // Mock implementation - calculate plugin checksum
    return 'sha256:' + Math.random().toString(36);
  }

  private async createPluginContext(manifest: PluginManifest): Promise<PluginContext> {
    // Create plugin context with proper paths and APIs
    const context: PluginContext = {
      extensionPath: path.join(this.configuration.pluginDirectory, manifest.id),
      extensionUri: `file://${path.join(this.configuration.pluginDirectory, manifest.id)}`,
      globalStoragePath: path.join(this.configuration.pluginDirectory, '.storage', manifest.id),
      subscriptions: [],
      secrets: {} as SecretStorage,
      globalState: {} as Memento,
      environmentVariableCollection: {} as EnvironmentVariableCollection,
      asAbsolutePath: (relativePath: string) => path.join(this.configuration.pluginDirectory, manifest.id, relativePath),
      globalStorageUri: `file://${path.join(this.configuration.pluginDirectory, '.storage', manifest.id)}`,
      logUri: `file://${path.join(this.configuration.pluginDirectory, '.logs', manifest.id + '.log')}`,
      extension: {} as Extension<any>,
      logger: {} as Logger
    };

    return context;
  }

  private async cleanupPluginContext(context: PluginContext): Promise<void> {
    // Cleanup subscriptions
    context.subscriptions.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        console.warn('Failed to dispose subscription:', error);
      }
    });
  }

  private async extractAndValidatePlugin(packagePath: string): Promise<PluginManifest> {
    // Mock implementation - extract and validate plugin package
    return {} as PluginManifest;
  }

  private async installPluginToDirectory(manifest: PluginManifest, packagePath: string): Promise<void> {
    // Mock implementation - install plugin to directory
    
  }

  private async removePluginFromFilesystem(pluginId: string): Promise<void> {
    // Mock implementation - remove plugin from filesystem
    
  }

  private calculateAverageActivationTime(): number {
    const plugins = Array.from(this.plugins.values());
    if (plugins.length === 0) return 0;
    
    const totalTime = plugins.reduce((sum, p) => sum + p.metrics.activationTime, 0);
    return totalTime / plugins.length;
  }

  private getSystemStartTime(): number {
    // Mock implementation - return system start time
    return Date.now() - 60000; // 1 minute ago
  }

  // Public getters
  getConfiguration(): PluginSystemConfiguration { return { ...this.configuration }; }
  getRegistry(): PluginRegistry { return this.registry; }
  getMarketplace(): MarketplaceManager { return this.marketplace; }
  getSecurityManager(): SecurityManager { return this.securityManager; }
  isSystemInitialized(): boolean { return this.isInitialized; }
}

// Supporting interfaces
interface PluginSystemConfiguration {
  pluginDirectory: string;
  sandboxEnabled: boolean;
  securityLevel: 'none' | 'basic' | 'strict';
  maxPlugins: number;
  maxMemoryPerPlugin: number;
  enableMarketplace: boolean;
  allowUnsignedPlugins: boolean;
  telemetryEnabled: boolean;
  autoUpdate: boolean;
  parallelActivation: boolean;
  activationTimeout: number;
}

export interface PluginSystemStatistics {
  totalPlugins: number;
  activePlugins: number;
  inactivePlugins: number;
  totalMemoryUsage: number;
  totalErrors: number;
  averageActivationTime: number;
  systemUptime: number;
}

// Supporting classes (basic implementations)
class PluginRegistry extends EventEmitter {
  constructor(private config: PluginSystemConfiguration) { super(); }
  async initialize(): Promise<void> { console.log('Registry initialized'); }
  async register(manifest: PluginManifest): Promise<void> { this.emit('plugin-registered', manifest); }
  async unregister(pluginId: string): Promise<void> { this.emit('plugin-unregistered', pluginId); }
  async getPlugin(pluginId: string): Promise<PluginManifest | undefined> { return undefined; }
  async getEnabledPlugins(): Promise<PluginManifest[]> { return []; }
  async setEnabled(pluginId: string, enabled: boolean): Promise<void> { }
}

class PluginLoader {
  constructor(private config: PluginSystemConfiguration) {}
  async initialize(): Promise<void> { console.log('Loader initialized'); }
  async loadPlugin(manifest: PluginManifest, context: PluginContext): Promise<any> { return {}; }
}

class SandboxManager {
  constructor(private config: PluginSystemConfiguration) {}
  async initialize(): Promise<void> { console.log('Sandbox manager initialized'); }
  async createSandbox(manifest: PluginManifest): Promise<PluginSandbox> { return {} as PluginSandbox; }
  async destroySandbox(sandbox: PluginSandbox): Promise<void> { }
  async cleanup(): Promise<void> { }
}

class APIProvider {
  constructor(private system: PluginArchitectureSystem) {}
  createAPI(manifest: PluginManifest, context: PluginContext): PluginAPI { return {} as PluginAPI; }
}

class SecurityManager {
  constructor(private config: PluginSystemConfiguration) {}
  async initialize(): Promise<void> { console.log('Security manager initialized'); }
  async validatePlugin(manifest: PluginManifest): Promise<void> { }
  async scanPlugin(manifest: PluginManifest): Promise<void> { }
  async cleanup(): Promise<void> { }
}

class LifecycleManager extends EventEmitter {
  constructor(private system: PluginArchitectureSystem) { super(); }
  async activate(instance: PluginInstance): Promise<void> { 
    instance.state = 'active';
    this.emit('plugin-activated', instance);
  }
  async deactivate(instance: PluginInstance): Promise<void> { 
    instance.state = 'inactive';
    this.emit('plugin-deactivated', instance);
  }
}

class MarketplaceManager extends EventEmitter {
  constructor(private config: PluginSystemConfiguration) { super(); }
  async initialize(): Promise<void> { console.log('Marketplace initialized'); }
  async downloadPlugin(pluginId: string, version?: string): Promise<string> { return '/tmp/plugin.zip'; }
  async cleanup(): Promise<void> { }
}

class PermissionManager {
  constructor(private config: PluginSystemConfiguration) {}
  async checkPermissions(manifest: PluginManifest): Promise<void> { }
}

export default PluginArchitectureSystem;
