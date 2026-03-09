describe('Applicant Flow', () => {
  const eduTypes = ['ม.6 / กศน.', 'ปวช.', 'ปวส.'];
  const applyDropdowns = ['รอบที่สมัคร', 'โครงการ', 'คณะ', 'สาขา'];
  const applicantData = {
    citizenId: (Math.random() * 10000000000000).toString().slice(0, 13),
    password: 'password123',
    fullName: 'สมศรี สีลอก',
    age: 18,
    gpax: (Math.random() * 4.00).toFixed(2),
    eduType: eduTypes[Math.floor(Math.random() * eduTypes.length)],
    eduStatus: Math.random() < 0.5 ? 'กำลังศึกษา' : 'สำเร็จการศึกษา',
    schoolName: 'โรงเรียน',
    tcasRound: 'รอบ 1',
    project: 'โครงการ Portfolio',
    faculty: 'คณะวิศวกรรมศาสตร์',
    program: 'วิศวกรรมคอมพิวเตอร์'
  }
  after(() => {
    cy.log('🧹 Cleaning up test data from database...');
    cy.task('cleanupTestData', applicantData.citizenId).then(() => {
      cy.log('✅ Test data successfully deleted');
    });
  });
  it('should navigate through the applicant process', () => {
    cy.visit('/');

    cy.contains('a', 'สมัครเรียน').click(); 
    cy.url().should('include', '/login');
    
    cy.contains('a', 'สมัครสมาชิกที่นี่').click();
    cy.url().should('include', '/register');

    cy.get('#nationalId').type(applicantData.citizenId);
    cy.get('#password').type(applicantData.password);
    cy.get('#fullName').type(applicantData.fullName);
    cy.get('#age').type(applicantData.age);
    cy.contains('button', 'สมัครสมาชิก').click();
    cy.url().should('include', '/login');

    cy.get('#userId').type(applicantData.citizenId);
    cy.get('#loginPassword').type(applicantData.password);
    cy.contains('button', 'เข้าสู่ระบบ').click();
    cy.url().should('include', '/');

    cy.contains('a', 'ข้อมูลผู้สมัคร').click();
    cy.url().should('include', '/student/details');

    cy.contains('button', applicantData.eduType).click();
    cy.contains('button', applicantData.eduStatus).click();
    cy.get('#schoolName').type(applicantData.schoolName);
    cy.get('#gpax').type(applicantData.gpax);
    cy.get('select')
  .find('option')
  .then(($options) => {
    const count = $options.length;
    const randomIndex = Math.floor(Math.random() * (count - 1)) + 1;
    cy.get('select').select(randomIndex);
  });
    cy.contains('button', 'บันทึกข้อมูลและคะแนน').click();
    cy.contains('a', 'สมัครเรียน').click();
    cy.url().should('include', '/apply');

    cy.wrap(applyDropdowns).each((dropdownLabel) => {
      cy.contains('label', dropdownLabel).parent().find('select').as('currentSelect');
      if (dropdownLabel === 'รอบที่สมัคร') {
        cy.get('@currentSelect').select('1');
      } else {
        cy.get('@currentSelect')
          .find('option')
          .should('have.length.greaterThan', 1) 
          .then(($options) => {
            const count = $options.length;
            const randomIndex = Math.floor(Math.random() * (count - 1)) + 1;
            const optionValueToSelect = $options[randomIndex].value;
            cy.get('@currentSelect').select(optionValueToSelect);
          });
      }
    });

    cy.get('#transcript-upload').selectFile('cypress/fixtures/dummy.pdf', { force: true });
    cy.get('#portfolio-upload').selectFile('cypress/fixtures/dummy.pdf', { force: true });
    cy.contains('button', 'ยืนยันการสมัคร').click();
    cy.contains('สำเร็จ!').should('be.visible');
    cy.contains('บันทึกใบสมัครของคุณเข้าสู่ระบบแล้ว').should('be.visible');
    cy.contains('button', 'ปิดหน้าต่างนี้').click();
    cy.url().should('include', '/');

    cy.contains('button', 'ออกจากระบบ').click();
    cy.url().should('include', '/');
})
});
