# 🎓 TCAS KMUTNB Hub

ระบบจำลองการรับสมัครนักศึกษาสำหรับ **มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB)** พัฒนาด้วย React และ Tailwind CSS v4 เน้นความเรียบง่ายและใช้งานง่ายสำหรับนักเรียนและเจ้าหน้าที่



## ✨ คุณสมบัติหลัก (Features)

* **Admission Criteria**: ระบบค้นหาเกณฑ์การรับสมัคร แยกตามคณะ ภาควิชา และสาขาวิชาอย่างละเอียด
* **Application Form**: แบบฟอร์มสมัครเรียนออนไลน์ พร้อมระบบ Drag & Drop สำหรับอัปโหลด Portfolio
* **Staff Dashboard**: ระบบหลังบ้านสำหรับเจ้าหน้าที่เพื่อค้นหา ตรวจสอบ และอนุมัติผลการสมัคร
* **Authentication**: ระบบเข้าสู่ระบบที่แยกสิทธิ์การใช้งาน (Role) ระหว่างนักเรียนและเจ้าหน้าที่โดยอัตโนมัติ
* **Responsive Design**: รองรับการใช้งานทุกหน้าจอ ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend**: React 19 (Vite)
* **Styling**: Tailwind CSS v4 (Modern Engine)
* **Routing**: React Router v7
* **Icons**: Lucide React
* **Components**: Hand-crafted UI based on Tailwind principles

## 📂 โครงสร้างโปรเจค (Project Structure)

```text
src/
 ┣ components/  # ชิ้นส่วน UI ที่ใช้ซ้ำ (Navbar, UI elements)
 ┣ lib/         # ข้อมูลจำลอง (Mock Data) และเครื่องมือเสริม
 ┣ pages/       # หน้าเว็บหลักทั้งหมด (Home, Apply, Staff, etc.)
 ┗ App.jsx      # ตัวควบคุมระบบ Routing หลัก
