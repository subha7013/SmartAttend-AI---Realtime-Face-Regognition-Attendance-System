# SmartAttend AI - Face Recognition Attendance System

A premium, state-of-the-art Real-Time Face Recognition Attendance Management System. This repository contains the complete stack, including a React client, a Node.js/Express backend server, and a Python AI face recognition microservice.

---

## 🚀 Key Features

*   **Real-Time Face Recognition:** Capture webcam frames directly in the browser and recognize registered students' faces with high precision.
*   **Analytics Dashboard:** View live attendance statistics, department-wise breakdowns, daily metrics, and last-7-day attendance trends.
*   **Dynamic Branded Reports:** Export attendance logs directly to beautifully styled Excel and PDF formats, with branding custom-tailored to the organization (e.g., Speedmart vs. SmartAttend).
*   **SMTP Low Attendance Alerts:** Automatically calculate attendance percentages and send elegant HTML warning emails to students below a configurable threshold (e.g., 75%).
*   **Security:** Role-based access control (Admin/Teacher) backed by secure JWT sessions and hashed passwords.

---

## 🛠️ Technology Stack

### Frontend Client
*   **React** (Vite build system)
*   **Lucide React** (Modern iconography)
*   **Chart.js / react-chartjs-2** (Data visualization)
*   **CSS / Tailwind CSS styling** (Glassmorphism design system)

### Backend API Server
*   **Node.js & Express**
*   **MongoDB & Mongoose** (Database modeling)
*   **Nodemailer** (SMTP email delivery)
*   **ExcelJS & PDFKit** (Document generation engine)
*   **JWT & bcryptjs** (Authentication & security)

### Python AI Service
*   **FastAPI / Flask**
*   **face_recognition** (dlib 128-dimensional embedding extraction)
*   **OpenCV**

---

## 📁 Repository Structure

```
├── client/          # React + Vite Frontend application
├── server/          # Node.js + Express API Server
└── ai-service/      # Python face embedding extraction service
```

---

## ⚙️ Local Setup Guide

### Prerequisites
*   Node.js (v16 or higher)
*   MongoDB running locally or a MongoDB Atlas URI
*   Python 3.8+ (for the AI Service)

### 1. Set Up the Server
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file using the example template:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and fill in your connection secrets (MongoDB URI, JWT secret, Gmail SMTP password).
5. Seed the admin account:
   ```bash
   node seedAdmin.js
   ```
6. Start the server in development mode:
   ```bash
   npm run dev
   ```

### 2. Set Up the Frontend Client
1. Navigate to the `client` directory:
   ```bash
   cd ../client
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

### 3. Set Up the AI Service
1. Navigate to the `ai-service` directory:
   ```bash
   cd ../ai-service
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Python AI API:
   ```bash
   python main.py
   ```

---

## 🔒 Security Note
*   The `.env` file is excluded in Git via `.gitignore` to prevent secret leakage.
*   Never commit production credentials directly. Use `.env.example` to track configuration updates.
