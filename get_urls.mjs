import fs from 'fs';
const res = await fetch('https://www.smashbros.com/ja_JP/');
const text = await res.text();
const urls = text.match(/https:\/\/www\.smashbros\.com\/assets_v2\/[^"'\s]+(png|jpg|svg)/g);
fs.writeFileSync('urls.txt', [...new Set(urls)].join('\n'));
