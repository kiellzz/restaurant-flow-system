const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = './input';
const outputDir = './output';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

fs.readdirSync(inputDir).forEach(file => {
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file);

  sharp(inputPath)
    .resize(256, 256, {
      fit: 'cover',
      kernel: sharp.kernel.lanczos3 // melhor qualidade
    })
    .sharpen() // melhora definição após upscale
    .webp({
      quality: 95,       // qualidade alta
      effort: 6          // compressão melhor (mais pesado, porém melhor)
    })
    .toFile(outputPath)
    .then(() => console.log(`✔ ${file}`))
    .catch(err => console.error(`Erro em ${file}`, err));
});