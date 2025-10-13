// TASK:669 tests for secretScanner
import { scanSecrets, redactSecrets, hasSecrets } from '../src/shared/secretScanner.ts';

function assert(cond, msg){ if(!cond) throw new Error('Assertion failed: ' + msg); }

(function testAwsAccessKey(){
  const key = 'AKIAABCDEFGHIJKLMNOP';
  const res = scanSecrets(`const k='${key}';`);
  assert(res.findings.length === 1, 'should detect aws access key');
  assert(res.findings[0].type === 'aws_access_key', 'type mismatch');
})();

(function testJwt(){
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjEyMzQ1fQ.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const res = scanSecrets(jwt);
  assert(res.findings.length === 1, 'should detect jwt');
})();

(function testRedaction(){
  const txt = 'Token: AKIAABCDEFGHIJKLMNOP';
  const red = redactSecrets(txt);
  assert(!red.includes('AKIA'), 'redacted text should not contain original key');
})();

(function testHasSecrets(){
  assert(hasSecrets('AKIAABCDEFGHIJKLMNOP'), 'hasSecrets should be true');
  assert(!hasSecrets('no secrets here'), 'hasSecrets should be false');
})();

console.log('secretScanner tests passed');
