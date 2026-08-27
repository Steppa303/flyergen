#!/usr/bin/env node
const FlyerRenderer = require('./renderer');

const renderer = new FlyerRenderer();

const [,, template, ...args] = process.argv;

if (!template) {
  console.log('FlyerGen CLI — Polizeiakademie Niedersachsen');
  console.log('');
  console.log('Usage: node src/cli.js <template-name> [options]');
  console.log('');
  console.log('Templates:');
  console.log('  01-krimi-tour        Krimi-Tour Flyer');
  console.log('  02-crime-coaches     Crime Coaches Flyer');
  console.log('  03-pol-informatik    Polizei-Informatik Flyer');
  console.log('');
  console.log('Options:');
  console.log('  --format png|pdf     Ausgabeformat (default: png)');
  console.log('  --dpi 72|300         Auflösung (default: 72)');
  console.log('  --key value          Template-Variablen');
  console.log('');
  console.log('Examples:');
  console.log('  node src/cli.js 01-krimi-tour --eventDate "25. Dezember 2026"');
  console.log('  node src/cli.js 02-crime-coaches --format pdf --headerLine2 "MORD IM PARK!"');
  process.exit(1);
}

// Parse args
const options = {};
const data = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1];
    if (key === 'format') {
      options.format = value;
    } else if (key === 'dpi') {
      options.dpi = parseInt(value, 10);
    } else {
      data[key] = value;
    }
    i++; // skip value
  }
}

try {
  console.log(`Rendering template "${template}"...`);
  const output = renderer.render(template, data, { format: options.format || 'png', dpi: options.dpi });
  console.log(`✅ Rendered: ${output}`);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
