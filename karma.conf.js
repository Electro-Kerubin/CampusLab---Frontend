// Configuración de Karma (runner de las pruebas unitarias con Jasmine).
// https://karma-runner.github.io/6.4/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
      // Reporter legible para presentar (npm run test:demo): lista cada prueba con ✓/✗.
      require('./scripts/karma-demo-reporter.cjs'),
    ],
    client: {
      jasmine: {
        // Orden aleatorio (por defecto en Jasmine): detecta pruebas que dependen unas de otras.
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true, // evita trazas duplicadas en el reporter HTML
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/campuslab'),
      subdir: '.',
      reporters: [
        { type: 'html' }, // coverage/campuslab/index.html para revisar línea a línea
        { type: 'lcovonly' }, // formato estándar para CI / SonarQube
        { type: 'text-summary' }, // resumen en consola
      ],
      // Umbral mínimo GLOBAL: si la cobertura baja de estos valores, `ng test --code-coverage` falla.
      // Medido el 2026-11-23: sentencias 97.2 %, ramas 88.88 %, funciones 95.2 %, líneas 97.57 %.
      // Se fija 2-4 puntos por debajo para tolerar cambios menores sin bajar la vara (ver TESTING.md).
      check: {
        global: {
          statements: 95,
          branches: 85,
          functions: 92,
          lines: 95,
        },
      },
    },
    // 'coverage' solo reporta cuando se ejecuta con --code-coverage.
    reporters: ['progress', 'kjhtml', 'coverage'],
    customLaunchers: {
      // Chrome sin interfaz y sin sandbox: necesario en contenedores (Codespaces, GitHub Actions).
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    // Puerto por defecto (9876). En Codespaces, .vscode/settings.json evita que VS Code lo abra en el
    // navegador: esa pestaña se sumaría como navegador de pruebas y alteraría el resultado (ver TESTING.md).
    // Codespaces no tiene pantalla: por defecto se usa Chrome headless.
    browsers: ['ChromeHeadlessCI'],
    // Si no hay ninguna prueba, fallar en vez de terminar en verde.
    failOnEmptyTestSuite: true,
    restartOnFileChange: true,
  });
};
