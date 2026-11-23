describe('Reservas', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/bookings*', { fixture: 'bookings.json' }).as('list');
    cy.loginDemo();
    cy.visit('/bookings');
    cy.wait('@list');
  });

  it('lista las reservas del backend', () => {
    cy.contains('Laboratorio de Química').should('exist');
    cy.contains('Laboratorio de Física').should('exist');
  });

  it('cambia el estado de una reserva (PUT /status)', () => {
    cy.intercept('PUT', '**/api/bookings/1/status', { statusCode: 200, body: {} }).as('status');
    cy.contains(/aprobar/i).first().click();
    cy.wait('@status').its('request.body').should('deep.equal', { status: 'APROBADA' });
  });

  it('crea una reserva (POST) desde el modal', () => {
    cy.intercept('POST', '**/api/bookings', { statusCode: 201, body: { id: 99 } }).as('create');
    cy.contains('button', /nueva reserva|crear/i).click();
    // AJUSTAR selectores según tu modal (name/placeholder/data-testid):
    cy.get('textarea, input[name="purpose"], input[placeholder*="prop" i]').first().type('Práctica E2E');
    cy.contains('button', /guardar|confirmar|solicitar|crear/i).last().click();
    cy.wait('@create').its('request.body').should('have.property', 'purpose');
  });
});
