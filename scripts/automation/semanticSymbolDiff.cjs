#!/usr/bin/env node
/**
 * semanticSymbolDiff.cjs
 * Extracts exported symbol signatures from TypeScript/TSX files and diffs against prior snapshot.
 * Output:
 *  - artifacts/semantic/semantic_symbol_snapshot.json
 *  - artifacts/semantic/semantic_symbol_diff.json
 * Classification:
 *  - addedSymbols, removedSymbols, changedSymbols (signature change)
 *  - breaking (removed + changed where shape difference is potentially breaking)
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = process.cwd();
const ART = path.join(ROOT,'artifacts');
const SEM_DIR = path.join(ART,'semantic');
const SNAP_FILE = path.join(SEM_DIR,'semantic_symbol_snapshot.json');
const DIFF_FILE = path.join(SEM_DIR,'semantic_symbol_diff.json');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function gatherSourceFiles(dir, acc=[]){
  const entries = fs.readdirSync(dir,{withFileTypes:true});
  for(const e of entries){
    if(e.name.startsWith('.')) continue;
    const full = path.join(dir,e.name);
    if(e.isDirectory()) gatherSourceFiles(full,acc); else if(/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) acc.push(full);
  }
  return acc;
}

function createProgram(files){
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
  let compilerOptions = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 };
  if(configPath){
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
    compilerOptions = parsed.options;
  }
  return ts.createProgram(files, compilerOptions);
}

function signatureForNode(node, checker){
  if(ts.isFunctionDeclaration(node) && node.name){
    const sym = checker.getSymbolAtLocation(node.name);
    if(sym){
      const sigs = checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration).getCallSignatures();
      const params = sigs[0]? sigs[0].getParameters().map(p=> checker.typeToString(checker.getTypeOfSymbolAtLocation(p,p.valueDeclaration||p.declarations?.[0]))) : [];
      const ret = sigs[0]? checker.typeToString(sigs[0].getReturnType()) : 'void';
      return `fn(${params.join(',')})=>${ret}`;
    }
  }
  if(ts.isInterfaceDeclaration(node)){
    const name = node.name.text;
    const members = node.members.map(m=> m.name && ts.isIdentifier(m.name)? m.name.text : '?');
    return `interface{${members.sort().join('|')}}`;
  }
  if(ts.isClassDeclaration(node) && node.name){
    const methods = node.members.filter(m=> ts.isMethodDeclaration(m) && m.name && ts.isIdentifier(m.name)).map(m=> m.name.text).sort();
    return `class{${methods.join('|')}}`;
  }
  if(ts.isTypeAliasDeclaration(node)){
    const name = node.name.text;
    const typeStr = node.type.getText();
    return `type=${typeStr}`;
  }
  if(ts.isEnumDeclaration(node)){
    const name = node.name.text;
    const members = node.members.map(m=> m.name.getText());
    return `enum{${members.join('|')}}`;
  }
  return null;
}

function extractExports(program){
  const checker = program.getTypeChecker();
  const symbolMap = {};
  for(const sf of program.getSourceFiles()){
    if(!sf.fileName.startsWith(path.join(ROOT,'src'))) continue;
    if(sf.isDeclarationFile) continue;
    ts.forEachChild(sf, node => {
      // gather only exported declarations
      const mods = node.modifiers?.map(m=> m.kind) || [];
      const isExported = mods.includes(ts.SyntaxKind.ExportKeyword) || (ts.isVariableStatement(node) && node.modifiers?.some(m=> m.kind===ts.SyntaxKind.ExportKeyword));
      if(!isExported) return;
      if(ts.isVariableStatement(node)){
        node.declarationList.declarations.forEach(decl=>{
          if(decl.name && ts.isIdentifier(decl.name)){
            const symSig = 'var';
            const key = `${path.relative(ROOT,sf.fileName)}::${decl.name.text}`;
            symbolMap[key] = symSig;
          }
        });
        return;
      }
      let id = (node).name && ts.isIdentifier((node).name) ? (node).name.text : undefined;
      if(!id) return;
      const sig = signatureForNode(node, checker);
      if(sig){
        const key = `${path.relative(ROOT,sf.fileName)}::${id}`;
        symbolMap[key] = sig;
      }
    });
  }
  return symbolMap;
}

function diff(prev, curr){
  const added=[]; const removed=[]; const changed=[]; const breaking=[];
  const prevKeys = new Set(Object.keys(prev));
  const currKeys = new Set(Object.keys(curr));
  currKeys.forEach(k=>{ if(!prevKeys.has(k)) added.push(k); else if(prev[k] !== curr[k]) { changed.push(k); if(isBreakingSignatureChange(prev[k], curr[k])) breaking.push(k); }});
  prevKeys.forEach(k=>{ if(!currKeys.has(k)) { removed.push(k); breaking.push(k); } });
  return { addedSymbols: added, removedSymbols: removed, changedSymbols: changed, breakingSymbols: Array.from(new Set(breaking)) };
}

function isBreakingSignatureChange(oldSig, newSig){
  if(oldSig === newSig) return false;
  // naive breaking heuristic: interface/class member count reduces, function param count decreases, or enum loses member
  const fn = /^fn\((.*?)\)=>/;
  if(fn.test(oldSig) && fn.test(newSig)){
    const oldParams = fn.exec(oldSig)[1].split(',').filter(Boolean);
    const newParams = fn.exec(newSig)[1].split(',').filter(Boolean);
    return newParams.length < oldParams.length; // removing params = breaking
  }
  if(oldSig.startsWith('interface{') && newSig.startsWith('interface{')){
    const oldMembers = oldSig.slice(10,-1).split('|').filter(Boolean);
    const newMembers = newSig.slice(10,-1).split('|').filter(Boolean);
    return newMembers.length < oldMembers.length;
  }
  if(oldSig.startsWith('class{') && newSig.startsWith('class{')){
    const oldMembers = oldSig.slice(6,-1).split('|').filter(Boolean);
    const newMembers = newSig.slice(6,-1).split('|').filter(Boolean);
    return newMembers.length < oldMembers.length;
  }
  if(oldSig.startsWith('enum{') && newSig.startsWith('enum{')){
    const oldMembers = oldSig.slice(5,-1).split('|').filter(Boolean);
    const newMembers = newSig.slice(5,-1).split('|').filter(Boolean);
    return newMembers.length < oldMembers.length;
  }
  return true; // type alias change -> assume breaking
}

function main(){
  ensureDir(SEM_DIR);
  const files = gatherSourceFiles(path.join(ROOT,'src'));
  const program = createProgram(files);
  const current = extractExports(program);
  let prev = {};
  if(fs.existsSync(SNAP_FILE)) prev = JSON.parse(fs.readFileSync(SNAP_FILE,'utf8'));
  const d = diff(prev,current);
  fs.writeFileSync(SNAP_FILE, JSON.stringify(current,null,2));
  fs.writeFileSync(DIFF_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), counts: { prev: Object.keys(prev).length, curr: Object.keys(current).length }, diff: d }, null, 2));
  console.log(`Semantic symbol diff written: ${DIFF_FILE}`);
}

main();
