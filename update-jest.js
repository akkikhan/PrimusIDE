const fs=require('fs');
const path='jest.config.js';
const config=fs.readFileSync(path,'utf8').split('\n');
const start=config.findIndex(line=>line.includes('testMatch'));
if(start!==-1){config.splice(start,3,  testMatch: ['<rootDir>/test/jest/**/*.(test|spec).+(ts|tsx|js)'],);} else {throw new Error('testMatch not found');}
fs.writeFileSync(path,config.join('\n'));
