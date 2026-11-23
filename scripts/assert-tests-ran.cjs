// Protección contra "falsos verdes" de `ng test`.
//
// Si el proceso de pruebas recibe SIGTERM mientras corre Karma (cancelación, un proceso externo,
// falta de recursos), Angular CLI termina con código 0 SIN haber ejecutado ninguna prueba.
// karma-coverage solo escribe lcov.info cuando la ejecución termina de verdad, así que:
//   --clean   borra la cobertura anterior (antes de las pruebas)
//   (sin args) falla si no se generó lcov.info (después de las pruebas)
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
