const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const srcDir = 'D:/小米互传/LingGuang-iOS-unsigned(10)/AiDiet-unsigned-app/AiDiet.app';
const ipaPath = 'D:/小米互传/LingGuang-iOS-unsigned(10)/AiDiet.ipa';

if (fs.existsSync(ipaPath)) fs.unlinkSync(ipaPath);

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

const files = walkDir(srcDir);
const entries = [];
let offset = 0;
const buffers = [];

for (const filePath of files) {
  const data = fs.readFileSync(filePath);
  const name = 'Payload/' + path.relative(path.dirname(srcDir), filePath).split(path.sep).join('/');
  const nameBuffer = Buffer.from(name, 'utf8');
  const crc = zlib.crc32(data);

  const header = Buffer.alloc(30 + nameBuffer.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc >>> 0, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  nameBuffer.copy(header, 30);

  entries.push({ name, crc, size: data.length, offset });
  buffers.push(header, data);
  offset += header.length + data.length;
}

let cdOffset = offset;
const cdBuffers = [];
for (const e of entries) {
  const nameBuffer = Buffer.from(e.name, 'utf8');
  const cd = Buffer.alloc(46 + nameBuffer.length);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4);
  cd.writeUInt16LE(20, 6);
  cd.writeUInt16LE(0, 8);
  cd.writeUInt16LE(0, 10);
  cd.writeUInt16LE(0, 12);
  cd.writeUInt32LE(e.crc >>> 0, 16);
  cd.writeUInt32LE(e.size, 20);
  cd.writeUInt32LE(e.size, 24);
  cd.writeUInt16LE(nameBuffer.length, 28);
  cd.writeUInt16LE(0, 30);
  cd.writeUInt16LE(0, 32);
  cd.writeUInt16LE(0, 34);
  cd.writeUInt16LE(0, 36);
  cd.writeUInt32LE(0, 38);
  cd.writeUInt32LE(e.offset, 42);
  nameBuffer.copy(cd, 46);
  cdBuffers.push(cd);
  offset += cd.length;
}

const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(entries.length, 8);
eocd.writeUInt16LE(entries.length, 10);
eocd.writeUInt32LE(offset - cdOffset, 12);
eocd.writeUInt32LE(cdOffset, 16);
eocd.writeUInt16LE(0, 20);

const fd = fs.openSync(ipaPath, 'w');
for (const buf of buffers) fs.writeSync(fd, buf);
for (const buf of cdBuffers) fs.writeSync(fd, buf);
fs.writeSync(fd, eocd);
fs.closeSync(fd);

console.log('IPA created:', fs.statSync(ipaPath).size, 'bytes');
console.log('Files:', entries.length);
entries.forEach(e => console.log(' -', e.name, e.size));
