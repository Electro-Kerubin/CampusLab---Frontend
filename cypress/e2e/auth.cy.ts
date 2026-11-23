describe('Autenticación (Microsoft SSO en modo demo)', () => {
  it('muestra solo el login con Microsoft', () => {
    cy.visit('/login');
    cy.contains('button', /microsoft/i).should('be.visible');
    cy.contains(/Entrar como (Admin|Técnico|Estudiante|Auditor)/i).should('not.exist');
  });

  it('redirige a /login al entrar a una ruta protegida sin sesión', () => {
    cy.visit('/bookings');
    cy.url().should('include', '/login');
  });

  it('inicia sesión y llega al dashboard', () => {
    cy.loginDemo();
    cy.contains('Carmen').should('exist');
  });
});
