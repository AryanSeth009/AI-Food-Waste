# FoodWaste.AI Dashboard

FoodWaste.AI is an AI-driven predictive and logistics optimization platform designed to reduce food waste and redistribute surplus food efficiently. It features locally-run Large Language Models (LLMs) via Ollama, Time-Series forecasting, and Route Optimization (VRP).

## Project Structure

- `src/`: The React + Vite frontend application.
- `backend/`: The Python FastAPI backend (Machine Learning & Optimization).

## Prerequisites

Before starting, ensure you have the following installed:
1. **Node.js** (v18 or higher) and **npm**
2. **Python** (3.9 or higher)
3. **Ollama** (for local AI inference)

---

## How to Start the Application

The platform requires three separate components to run simultaneously. Open three terminal windows and start each part:

### Step 1: Start the Local AI Engine (Ollama)
The AI Advisor component requires a local instance of the Llama 3 model.
Open a terminal and run:
```bash
# Start the Ollama server (it runs in the background on some systems)
ollama serve

# Pull the required Llama 3 model (if not already downloaded)
ollama pull llama3
```

### Step 2: Start the Python Backend (FastAPI)
The backend powers the Time-Series Forecasting and Vehicle Routing Optimization.
Open a second terminal, navigate to the `backend` directory:
```bash
cd backend

# Create and activate a virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate
# For Mac/Linux: source venv/bin/activate

# Install the necessary dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn main:app --reload
```
The backend will run on **http://localhost:8000**.

### Step 3: Start the React Frontend (Vite)
The frontend provides the Operations & Analytics Dashboard UI.
Open a third terminal, at the root of the project:
```bash
# Install frontend dependencies (only needed the first time)
npm install

# Start the Vite development server
npm run dev
```
The frontend will run on **http://localhost:5173**. 

Open this URL in your browser to access the FoodWaste.AI Dashboard!
