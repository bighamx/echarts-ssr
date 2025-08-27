const echarts = require('echarts');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function renderOptionToSVG(option, width, height) {
  const chart = echarts.init(null, null, {
    renderer: 'svg',
    ssr: true,
    width: width || 400,
    height: height || 300
  });
  chart.setOption(option);
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}

async function renderEChartToFiles(params) {
  const option = params.option;
  const width = params.width || 400;
  const height = params.height || 300;
  const formats = params.formats || ['svg', 'png'];
  const outDir = params.outDir || path.resolve(__dirname, 'output');
  const outName = params.outName || 'chart';

  if (!option || typeof option !== 'object') {
    throw new Error('option 不能为空，且需为对象');
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const svgStr = renderOptionToSVG(option, width, height);
  const result = {};

  if (formats.includes('svg')) {
    const svgPath = path.join(outDir, `${outName}.svg`);
    fs.writeFileSync(svgPath, svgStr, 'utf8');
    result.svgPath = svgPath;
  }

  if (formats.includes('png')) {
    const pngPath = path.join(outDir, `${outName}.png`);
    await sharp(Buffer.from(svgStr)).png({ quality: 90 }).toFile(pngPath);
    result.pngPath = pngPath;
  }

  return result;
}

async function renderEChartToBuffers(params) {
  const option = params.option;
  const width = params.width || 400;
  const height = params.height || 300;
  const formats = params.formats || ['svg', 'png'];

  if (!option || typeof option !== 'object') {
    throw new Error('option 不能为空，且需为对象');
  }

  const svgStr = renderOptionToSVG(option, width, height);
  const result = {};

  if (formats.includes('svg')) {
    result.svg = Buffer.from(svgStr, 'utf8');
  }
  if (formats.includes('png')) {
    result.png = await sharp(Buffer.from(svgStr)).png({ quality: 90 }).toBuffer();
  }

  return result;
}

function parseArgs(argv) {
  const args = {};
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith('--')) {
      const eqIndex = token.indexOf('=');
      let key;
      let value;
      if (eqIndex !== -1) {
        key = token.slice(2, eqIndex);
        value = token.slice(eqIndex + 1);
      } else {
        key = token.slice(2);
        value = tokens[i + 1];
        i++;
      }
      args[key] = value;
    }
  }
  return args;
}

async function cli() {
  try {
    const args = parseArgs(process.argv);
    const outDir = args.outDir ? path.resolve(process.cwd(), args.outDir) : undefined;
    const outName = args.outName || 'chart';
    const width = args.width ? Number(args.width) : undefined;
    const height = args.height ? Number(args.height) : undefined;
    const formats = args.format
      ? (args.format === 'both' ? ['svg', 'png'] : [args.format])
      : undefined;

    let option;
    if (args.optionPath) {
      const p = path.resolve(process.cwd(), args.optionPath);
      const content = fs.readFileSync(p, 'utf8');
      option = JSON.parse(content);
    } else if (args.option) {
      option = JSON.parse(args.option);
    } else {
      throw new Error('请通过 --optionPath 指定 JSON 文件，或用 --option 传入 JSON 字符串');
    }

    const res = await renderEChartToFiles({ option, width, height, formats, outDir, outName });
    if (res.svgPath) console.log('SVG 文件：', res.svgPath);
    if (res.pngPath) console.log('PNG 文件：', res.pngPath);
    process.exit(0);
  } catch (err) {
    console.error('[生成失败]', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) {
  cli();
}

module.exports = {
  renderOptionToSVG,
  renderEChartToFiles,
  renderEChartToBuffers
};