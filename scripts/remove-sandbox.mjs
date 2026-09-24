import fs from 'fs';
const file = 'c:/website anime/src/components/watch-client.tsx';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/sandbox="[^"]+"\r?\n?/, '');
fs.writeFileSync(file, data);
console.log('Success removing sandbox');
