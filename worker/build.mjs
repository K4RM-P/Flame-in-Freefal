import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { runInNewContext } from 'node:vm';

const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const assets = {};
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    if (entry.name === 'server' || entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    const url = prefix + '/' + entry.name;
    if (entry.isDirectory()) await collect(path, url);
    else if (types[extname(path)]) assets[url] = [types[extname(path)], (await readFile(path)).toString('base64')];
  }
}
await collect('dist');
const app = await readFile('dist/app.js','utf8');
const catalog = runInNewContext(app.slice(0,app.indexOf('const samples')) + '\nrecords')
  .map(({id,title,conditions,result,implication,limit})=>({id,title,conditions,result,implication,limit}));
const bundle = 'const assets = ' + JSON.stringify(assets) + ';\nconst catalog = ' + JSON.stringify(catalog) + ';\n';
const worker = await readFile('worker/index.mjs','utf8');
await mkdir('dist/server',{recursive:true});
await writeFile('dist/server/index.js', bundle + worker.replace("import { assets, catalog } from './bundle.mjs';",''));
