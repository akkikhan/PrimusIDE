const fs=require('fs');
const path='src/main/main.ts';
let content=fs.readFileSync(path,'utf8');
content=content.replace("return { error: Provider '' is not configured, requestId: req.id };","return { error: Provider '' is not configured, requestId: req.id };");
content=content.replace("return { error: Provider '' endpoint not configured, requestId: req.id };","return { error: Provider '' endpoint not configured, requestId: req.id };");
fs.writeFileSync(path,content);
