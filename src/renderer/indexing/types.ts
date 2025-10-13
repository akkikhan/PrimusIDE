export interface FileNode {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export enum SymbolKind {
  File = 'file',
  Module = 'module',
  Namespace = 'namespace',
  Package = 'package',
  Class = 'class',
  Method = 'method',
  Property = 'property',
  Field = 'field',
  Constructor = 'constructor',
  Enum = 'enum',
  Interface = 'interface',
  Function = 'function',
  Variable = 'variable',
  Constant = 'constant',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'array',
  Object = 'object',
  Key = 'key',
  Null = 'null',
  EnumMember = 'enum-member',
  Struct = 'struct',
  Event = 'event',
  Operator = 'operator',
  TypeParameter = 'type-parameter',
}


export interface SymbolInfo {
  name: string;
  kind: SymbolKind;
  path: string;
  position: {
    start: number;
    end: number;
  };
}

export interface ProjectIndex {
  fileTree: FileNode;
  symbols: SymbolInfo[];
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
}
