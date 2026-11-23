describe('Resiliencia: backend caído', () => {
  it('la app sigue usable con datos demo', () => {
    cy.intercept('**/api/**', { forceNetworkError: true });
    cy.loginDemo();
    cy.visit('/dashboard');
    cy.get('body').should('not.contain.text', 'Uncaught');
    cy.get('canvas').should('exist'); // ng2-charts renderiza
  });
});
