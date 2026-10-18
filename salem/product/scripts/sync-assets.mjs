import {mkdirSync,cpSync,copyFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(root,'../../assets');
const destination=path.resolve(root,'../public/salem-art');
mkdirSync(destination,{recursive:true});
for(const directory of ['townhall-art','portraits']){
  const sourceDir=path.join(source,directory);
  if(!existsSync(sourceDir))throw new Error('Missing Salem source artwork: '+sourceDir);
  cpSync(sourceDir,path.join(destination,directory),{recursive:true,force:true});
}
for(const name of ['moonlit_colonial_village_in_fog.webp','moonlit_cat_over_the_haunted_village.webp']){
  copyFileSync(path.join(source,name),path.join(destination,name));
}
console.log('Synced Salem role and environmental artwork to standalone Next.js public folder.');
