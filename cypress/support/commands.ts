declare global {
  namespace Cypress {
    interface Chainable {
      /** Login en modo demo (clientId placeholder): simula Microsoft SSO sin Azure real. */
      loginDemo(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginDemo', () => {
  cy.visit('/login');
  cy.contains('button', /microsoft/i).click();
  cy.url().should('include', '/dashboard');
});

export {};
