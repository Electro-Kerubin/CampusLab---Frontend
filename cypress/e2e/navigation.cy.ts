describe('Navegación entre pantallas', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/**', { statusCode: 500 }); // fuerza datos demo
    cy.loginDemo();
  });

  [
    ['/dashboard', /dashboard/i],
    ['/bookings', /reservas/i],
    ['/catalog', /cat[aá]logo/i],
    ['/reports', /reporte|anal[ií]tica/i],
    ['/audit', /auditor[ií]a/i],
  ].forEach(([path, title]) => {
    it(`carga ${path}`, () => {
      cy.visit(path as string);
      cy.url().should('include', path as string);
      cy.contains(title as RegExp).should('exist');
    });
  });
});
