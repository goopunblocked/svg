import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const sources = Object.fromEntries(['ugs','seraph','truffled','ckv'].map(key=>[key,{owner:'gmshelf'}]));
sources.fourgames = {owner:'electricxmaxx',repo:'mathassignments'};
const settings = {};
const code = readFileSync(new URL('../app/catalog-player.js',import.meta.url),'utf8');
const {gameFile,repositoryLink,catalogEntry,isolatedGameStorage} = runInNewContext(
  code + '\n;({gameFile,repositoryLink,catalogEntry,isolatedGameStorage})',
  {URL,settings,sources,validBase:value=>value,$:()=>({})}
);

test('catalog entries, pasted CDN links and GitHub preview URLs resolve to the gameplay file',()=>{
  const expected = gameFile('ugs','/ugs/cl1.html');
  for (const link of [
    'https://cdn.gitdelivr.in/gh/gmshelf/ugs/main/ugs/cl1.html',
    'https://cdn.jsdelivr.net/gh/gmshelf/ugs@main/ugs/cl1.html',
    'https://github.com/gmshelf/ugs/blob/main/ugs/cl1.html',
    'https://raw.githubusercontent.com/gmshelf/ugs/refs/heads/main/ugs/cl1.html'
  ]) {
    assert.equal(repositoryLink(link).key,'ugs');
    assert.deepEqual(gameFile('ugs',link),expected);
  }
  assert.equal(expected.raw,'https://raw.githubusercontent.com/gmshelf/ugs/main/ugs/cl1.html');
  assert.throws(()=>gameFile('ugs','https://github.com/example/ugs/blob/main/ugs/cl1.html'));
  assert.throws(()=>gameFile('ugs','/ugs/%2e%2e/cl1.html'));
  assert.throws(()=>gameFile('ugs','/ugs/%2Ffile.html'));
  assert.equal(repositoryLink('https://github.com/gmshelf/ugs'),null);
});

test('files resolve relative to the game directory; the original 4Games aliases still work',()=>{
  const seraph = gameFile('seraph','/seraph/slope/index.html');
  assert.equal(new URL('UnityLoader.js',seraph.cdn).href,'https://cdn.jsdelivr.net/gh/gmshelf/seraph@main/seraph/slope/UnityLoader.js');
  assert.equal(catalogEntry('fourgames',{name:'Age of War 2',url:'Age of War 2.htmll'}).file,'Age%20of%20War%202.html');
});

test('games in opaque frames can use private score storage',()=>{
  const frame = {};
  Object.defineProperty(frame,'localStorage',{configurable:true,get(){throw new Error('Storage unavailable');}});
  runInNewContext('('+isolatedGameStorage.toString()+')()', {window:frame});
  frame.localStorage.setItem('score',12);
  assert.equal(frame.localStorage.getItem('score'),'12');
  assert.equal(frame.sessionStorage.getItem('score'),null);
});
