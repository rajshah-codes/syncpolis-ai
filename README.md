# 🌐 SyncPolis AI
**Institutional-Grade Digital Public Infrastructure (DPI) for Smart City Governance**

[![Live Demo](https://img.shields.io/badge/Live_Demo-View_Web_Service-0ea5e9?style=for-the-badge&logo=render)](https://syncpolis-ai.onrender.com)
[![Video Pitch](https://img.shields.io/badge/Pitch-Watch_on_YouTube-ef4444?style=for-the-badge&logo=youtube)](https://youtu.be/otcSOFCmJ8Q?si=3M9f1AaPq4vYuveV)

## 🚀 The Vision
Governments across India and BRICS nations face a critical bottleneck: public infrastructure grievances are trapped in isolated departmental silos. When a water main bursts or a road degrades, citizen feedback is fragmented, leading to delayed responses and misaligned public spending. 

**SyncPolis AI** is a highly scalable, multimodal GovTech platform built on the Google Cloud stack. It unifies multilingual citizen feedback, automates high-priority resource routing for policymakers via a live GIS dashboard, and enforces accountability using Machine Vision to verify infrastructure repairs in real-time.

---

## ✨ Core Features

*   🎙️ **Multimodal Citizen Intake:** Citizens can report issues natively using Voice Dictation (Google Cloud Speech-to-Text), Camera uploads, or text in their local dialect.
*   🧠 **Gemini-Powered Policy Engine:** Uses **Gemini 3.5 Flash** to act as an automated civil engineer. It ingests the raw grievance, identifies the exact municipal department, calculates a threat index, and generates a CPWD-compliant financial budget and engineering solution.
*   🌍 **Live GIS Observatory:** A real-time dashboard powered by **Google Maps Platform** that visualizes regional infrastructure deficits (water scarcity, road damage, grid stability) for policymakers.
*   📸 **Machine Vision Audit:** Field engineers capture geotagged photos of completed repairs. **Vertex AI Vision** models analyze the structural integrity and material texture in real-time before officially closing the ledger.
*   🌐 **Zero-Latency Multilingual DOM:** Full UI translates instantly into English, Hindi, Mandarin, Portuguese, and Russian without page reloads, ensuring inclusive access across all BRICS nations.
*   🛡️ **Bulletproof Fallback Engine:** Features a robust offline/fallback telemetry system to guarantee 100% uptime even during network or API latency.

---

## 🛠️ Technology Stack

### **Google Cloud & AI**
*   **Google Gemini 3.5 Flash** (`@google/genai` SDK) - Core reasoning, policy generation, and budget estimation.
*   **Vertex AI (AutoML/Vision)** - Predictive modeling and visual verification of field repairs.
*   **Google BigQuery** - Massive-scale telemetry data ingestion and hotspot mapping.
*   **Google Maps Platform** - Geospatial coordinate resolution and live tracking.

### **Backend & Frontend**
*   **Node.js & Express.js** - High-performance backend routing and API management.
*   **Vanilla JS (ES6) & HTML5** - Lightweight, lightning-fast frontend engine.
*   **Tailwind CSS** - Responsive, glassmorphic UI design customized for a "Cyber-Gov" aesthetic.
*   **Render** - Cloud platform hosting for continuous deployment.

---

## 📂 System Architecture Flow
1. **Ingestion Layer:** Citizen submits a localized voice/image grievance via the PWA.
2. **Intelligence Engine:** The payload is processed by the Express backend and fed into the Gemini 3.5 Flash multimodal model.
3. **Data Routing:** Gemini outputs strict JSON containing threat scores, budgets, and engineering steps.
4. **Policymaker Matrix:** The data updates the Live Analytics Matrix and GIS map for immediate administrative dispatch.
5. **Enforcement:** Field workers execute the task and upload visual proof, validated by AI vision models.

---

## 👨‍💻 Team: UrbanPulse Alchemists
We are a squad of Semester 3 B.Sc. (Hons) Computer Science students from the College of Vocational Studies (CVS), University of Delhi, using Google Cloud, AI Studio, and the Gemini API to turn raw community data into actionable insights for local administrators.

*   **Raj Shah** 
*   **Riya Chauhan**
*   **Ayushi Bhadauriya**
*   **Sanya Kumari**

---

## 🏆 Hackathon Submission
Built with ❤️ by **UrbanPulse Alchemists** for the **Build With AI BRICS Hackathon (Code for Communities)**.
