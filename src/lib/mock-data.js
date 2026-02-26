// ============================================================
// TCAS KMUTNB Hub - Mock Data (ภาษาไทย & ลบ TypeScript ออกแล้ว)
// ============================================================

export const faculties = [
  {
    id: "eng",
    name: "คณะวิศวกรรมศาสตร์",
    departments: [
      {
        id: "cpe",
        name: "ภาควิชาวิศวกรรมคอมพิวเตอร์",
        majors: [
          {
            id: "cpe-regular",
            name: "วิศวกรรมคอมพิวเตอร์ (ภาคปกติ)",
            rounds: [
              {
                round: 1,
                roundName: "Portfolio",
                projectName: "รับตรง โครงการเรียนดี",
                seats: 30,
                minGPA: 3.0,
                requiredTests: ["TGAT", "TPAT3"],
              },
              {
                round: 2,
                roundName: "Quota",
                projectName: "โควตาพื้นที่เครือข่าย",
                seats: 20,
                minGPA: 2.75,
                requiredTests: ["TGAT", "A-Level Math"],
              },
            ],
          },
          {
            id: "cpe-inter",
            name: "วิศวกรรมคอมพิวเตอร์ (หลักสูตรนานาชาติ)",
            rounds: [
              {
                round: 1,
                roundName: "Portfolio",
                projectName: "รับตรง นานาชาติ",
                seats: 15,
                minGPA: 3.25,
                requiredTests: ["IELTS 5.5+", "SAT Math"],
              },
            ],
          },
        ],
      },
      {
        id: "ee",
        name: "ภาควิชาวิศวกรรมไฟฟ้า",
        majors: [
          {
            id: "ee-power",
            name: "วิศวกรรมไฟฟ้ากำลัง",
            rounds: [
              {
                round: 1,
                roundName: "Portfolio",
                projectName: "รับตรง โครงการเรียนดี",
                seats: 25,
                minGPA: 2.8,
                requiredTests: ["TGAT", "TPAT3"],
              },
              {
                round: 3,
                roundName: "Admission",
                projectName: "Admission กลาง",
                seats: 40,
                minGPA: 2.5,
                requiredTests: ["A-Level Physics", "TGAT", "TPAT3"],
              },
            ],
          },
        ],
      },
      {
        id: "me",
        name: "ภาควิชาวิศวกรรมเครื่องกล",
        majors: [
          {
            id: "me-regular",
            name: "วิศวกรรมเครื่องกล",
            rounds: [
              {
                round: 1,
                roundName: "Portfolio",
                projectName: "รับตรง โครงการเรียนดี",
                seats: 35,
                minGPA: 2.8,
                requiredTests: ["TGAT", "TPAT3"],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "sci",
    name: "คณะวิทยาศาสตร์ประยุกต์",
    departments: [
      {
        id: "cs",
        name: "ภาควิชาวิทยาการคอมพิวเตอร์",
        majors: [
          {
            id: "cs-regular",
            name: "วิทยาการคอมพิวเตอร์",
            rounds: [
              {
                round: 1,
                roundName: "Portfolio",
                projectName: "รับตรง โครงการเรียนดี",
                seats: 40,
                minGPA: 2.75,
                requiredTests: ["TGAT", "A-Level Math"],
              },
              {
                round: 2,
                roundName: "Quota",
                projectName: "โควตาภูมิภาค",
                seats: 25,
                minGPA: 2.5,
                requiredTests: ["TGAT"],
              },
            ],
          },
        ],
      },
      {
        id: "stat",
        name: "ภาควิชาสถิติประยุกต์",
        majors: [
          {
            id: "stat-applied",
            name: "สถิติประยุกต์",
            rounds: [
              {
                round: 1,
                roundName: "Portfolio",
                projectName: "รับตรง โครงการเรียนดี",
                seats: 30,
                minGPA: 2.5,
                requiredTests: ["TGAT", "A-Level Math"],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ita",
    name: "คณะเทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล",
    departments: [
      {
        id: "it",
        name: "ภาควิชาเทคโนโลยีสารสนเทศ",
        majors: [
          {
            id: "it-regular", // 👈 ตัวที่บั๊กหาไม่เจอตอนแรกอยู่ตรงนี้ครับ!
            name: "เทคโนโลยีสารสนเทศ",
            rounds: [
              {
                round: 1,
                roundName: "Portfolio",
                projectName: "รับตรง โครงการผู้มีทักษะพิเศษ",
                seats: 50,
                minGPA: 2.5,
                requiredTests: ["TGAT"],
              },
              {
                round: 3,
                roundName: "Admission",
                projectName: "Admission กลาง",
                seats: 30,
                minGPA: 2.25,
                requiredTests: ["A-Level", "TGAT"],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bus",
    name: "คณะบริหารธุรกิจ",
    departments: [
      {
        id: "mgmt",
        name: "ภาควิชาบริหารธุรกิจ",
        majors: [
          {
            id: "mgmt-regular",
            name: "บริหารธุรกิจ",
            rounds: [
              {
                round: 2,
                roundName: "Quota",
                projectName: "โควตาโรงเรียนเครือข่าย",
                seats: 45,
                minGPA: 2.5,
                requiredTests: ["TGAT"],
              },
            ],
          },
        ],
      },
    ],
  },
]

export const topFaculties = [
  { name: "วิศวกรรมศาสตร์", applicants: 2450, color: "var(--chart-1)" },
  { name: "วิทยาศาสตร์ประยุกต์", applicants: 1820, color: "var(--chart-2)" },
  { name: "เทคโนโลยีสารสนเทศฯ", applicants: 1540, color: "var(--chart-3)" },
  { name: "บริหารธุรกิจ", applicants: 1230, color: "var(--chart-4)" },
  { name: "สถาปัตยกรรมศาสตร์", applicants: 980, color: "var(--chart-5)" },
]

export const mockApplicants = [
  {
    id: "1",
    name: "สมชาย ใจดี",
    nationalId: "1100800123456",
    age: 18,
    round: 1,
    faculty: "คณะวิศวกรรมศาสตร์",
    major: "วิศวกรรมคอมพิวเตอร์ (ภาคปกติ)",
    studyPlan: "วิทย์-คณิต",
    gpa: 3.45,
    portfolioUrl: "/uploads/portfolio_1.pdf",
    status: "pending",
  },
  {
    id: "2",
    name: "ณัฐยา ศรีสุข",
    nationalId: "1100800234567",
    age: 18,
    round: 1,
    faculty: "คณะวิศวกรรมศาสตร์",
    major: "วิศวกรรมคอมพิวเตอร์ (ภาคปกติ)",
    studyPlan: "วิทย์-คณิต",
    gpa: 3.82,
    portfolioUrl: "/uploads/portfolio_2.pdf",
    status: "approved",
  },
  {
    id: "3",
    name: "ปิยวัฒน์ ธรรมมา",
    nationalId: "1100800345678",
    age: 19,
    round: 1,
    faculty: "คณะวิศวกรรมศาสตร์",
    major: "วิศวกรรมคอมพิวเตอร์ (ภาคปกติ)",
    studyPlan: "วิทย์-คณิต",
    gpa: 2.65,
    portfolioUrl: null,
    status: "rejected",
  },
  {
    id: "4",
    name: "กนกวรรณ มีศรี",
    nationalId: "1100800456789",
    age: 18,
    round: 1,
    faculty: "คณะวิศวกรรมศาสตร์",
    major: "วิศวกรรมคอมพิวเตอร์ (ภาคปกติ)",
    studyPlan: "วิทย์-คณิต",
    gpa: 3.21,
    portfolioUrl: "/uploads/portfolio_4.pdf",
    status: "pending",
  },
  {
    id: "5",
    name: "ธนกร ปราการ",
    nationalId: "1100800567890",
    age: 18,
    round: 2,
    faculty: "คณะวิทยาศาสตร์ประยุกต์",
    major: "วิทยาการคอมพิวเตอร์",
    studyPlan: "วิทย์-คณิต",
    gpa: 3.15,
    portfolioUrl: "/uploads/portfolio_5.pdf",
    status: "pending",
  },
  {
    id: "6",
    name: "สุภาพร ชัย",
    nationalId: "1100800678901",
    age: 19,
    round: 1,
    faculty: "คณะวิทยาศาสตร์ประยุกต์",
    major: "วิทยาการคอมพิวเตอร์",
    studyPlan: "ศิลป์-คำนวณ",
    gpa: 2.95,
    portfolioUrl: "/uploads/portfolio_6.pdf",
    status: "pending",
  },
  {
    id: "7",
    name: "อาทิตย์ สุวรรณรัตน์",
    nationalId: "1100800789012",
    age: 18,
    round: 1,
    faculty: "คณะวิศวกรรมศาสตร์",
    major: "วิศวกรรมไฟฟ้ากำลัง",
    studyPlan: "วิทย์-คณิต",
    gpa: 3.55,
    portfolioUrl: "/uploads/portfolio_7.pdf",
    status: "approved",
  },
  {
    id: "8",
    name: "วราภรณ์ มาลัย",
    nationalId: "1100800890123",
    age: 18,
    round: 1,
    faculty: "คณะวิศวกรรมศาสตร์",
    major: "วิศวกรรมเครื่องกล",
    studyPlan: "วิทย์-คณิต",
    gpa: 3.10,
    portfolioUrl: "/uploads/portfolio_8.pdf",
    status: "pending",
  },
]