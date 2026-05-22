# Fitte AI Stylist 👗✨

An elegant, cloud-native, and responsive full-stack web application designed for interactive wardrobe curation and dynamic, multi-model AI fashion style advice. Developed as a Master's Thesis project at the Lublin University of Technology.

The platform enables users to catalog their virtual clothing items and receive context-aware outfit recommendations using advanced Large Language Models (LLMs) and custom data pipelines.

---

## 🏗️ Project Architecture & Repository Structure

This repository is organized as a monorepo, separating the system logic into modular layers:

* **`client/`** – Single Page Application (SPA) user interface built with **React.js (Vite)**, **Tailwind CSS**, and **Lucide React**. Highly optimized for state-driven UI interactions and clean user profile updates.
* **`server/`** – Production-ready REST API environment built on **Node.js (Express.js)**, interacting with **MongoDB Atlas** through **Prisma ORM**. Manages business logic, JWT session tokens, and core backend functionality.
* **`ai-service/`** – Academic-oriented context parsing architecture handling data formatting, agent instructions, and context injection pipelines.

---

## 🧠 Core AI Modules & Systems

1.  **Retrieval-Augmented Generation (RAG):** A custom internal data injection process that pairs active database records (user-specific wardrobe items, category fields, preferred styles) with context prompts to ensure completely custom, non-generic styling responses.
2.  **Multi-Model Benchmarking Interface:** A dedicated evaluation framework enabling users to review and benchmark generated outputs across multiple concurrent model infrastructures (**Google Gemini 2.5 API** vs. **Llama 3.3 via Groq Cloud**) and evaluate specific responses using a 1-5 star user rating system.

---

## ⚙️ Main Technologies Used

* **Frontend:** React.js, Vite, Tailwind CSS, React Context API, React Router DOM
* **Backend:** Node.js, Express.js, Prisma ORM, JWT Authentication, Cloudinary API
* **Database:** MongoDB Atlas (Cloud Database)
* **AI Integration:** Google Gemini API, Groq Cloud API (Llama Models)
* **Hosting Deployment:** Vercel (Client App) & Render (Backend API Service)

---

## 🚀 Getting Started Locally

### 1. Pre-requisites
Ensure you have **Node.js (v18+)** and **npm** installed on your system.

### 2. Backend Setup (`server/`)
1. Navigate to the server folder and install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Create a .env file in the server/ directory and configure your credentials:
```code snippet
PORT=5001
DATABASE_URL="your-mongodb-atlas-url"
JWT_SECRET="your-jwt-auth-token-secret"
GEMINI_API_KEY="your-gemini-cloud-key"
GROQ_API_KEY="your-groq-cloud-key"
CLOUDINARY_URL="your-cloudinary-media-url"
```
3. Generate the database Prisma client and apply schemas:
```bash
npx prisma generate
npx prisma db push
```
4. Fire up the local development API instance:
```bash
npm run dev
```
### 3. Frontend Setup (`client/`)
1. In a new terminal window, navigate to the client folder and install packages:
```bash
cd client
npm install
```
2. Verify or update the API request target in `src/config.js` to link with your backend process:
```JavaScript
export const API_BASE_URL = "http://localhost:5001/api";
```
3. Start the Vite UI local instance:
```bash
npm run dev
```
## 🌐 Production Deployments & SPA Fallbacks
Live UI Client Web App: Hosted via Vercel

Live API Server Instance: Hosted via Render

Note for Vercel production hosting: The client application includes a custom vercel.json rewrite policy configured directly at the frontend deployment block to properly route clean SPA view extensions (e.g., /profile, /assistant) directly back into the core application engine. This successfully completely resolves standard routing 404 Not Found hosting errors during deep link page browser reloads.