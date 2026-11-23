//PARA TESTING
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'coverage', 'campuslab');
const lcov = path.join(dir, 'lcov.info');

if (process.argv.includes('--clean')) {
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(0);
}

if (!fs.existsSync(lcov) || fs.statSync(lcov).size === 0) {
  console.error('✖ Las pruebas no llegaron a ejecutarse (no se generó coverage/campuslab/lcov.info).');
  process.exit(1);
}
console.log('✔ Pruebas ejecutadas y cobertura generada en coverage/campuslab/');
