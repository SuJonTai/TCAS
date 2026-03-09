describe('Visitor Flow', () => {
  it('should navigate through admission details and back to home', () => {
    cy.visit('/');

    cy.contains('a', 'รายละเอียดรับสมัคร').click(); 
    cy.url().should('include', '/admission');
t
    cy.contains('คณะวิศว').should('be.visible').click();
    cy.contains('วิศวกรรมคอมพิวเตอร์').click();

    cy.url().should('match', /\/admission\/\d+/); 
    cy.contains('เกณฑ์รับสมัคร').should('be.visible');

    cy.contains('กลับหน้ารวมเกณฑ์').click();
    cy.url().should('include', '/admission');

    cy.contains('หน้าหลัก').click();
    cy.url().should('include', '/');
  })
})