import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));

// API routes go here FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Endpoint de respaldo (el análisis se realiza de manera 100% local en el navegador)
app.post("/api/analyze-tactics", async (req, res) => {
  res.json({
    vulnerabilidad_tactica: "PROCESADO DE MANERA LOCAL EN NAVEGADOR POR PRIVACIDAD",
    factor_coercion: "SISTEMA DESCONECTADO DE IA CONVENCIONAL DE LA NUBE",
    comportamiento_banda: "CONFIDENCIALIDAD DEL CORPUS GARANTIZADA"
  });
});

export default app;
