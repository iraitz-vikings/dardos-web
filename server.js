import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const dist = path.join(__dirname, "dist");

app.use(express.static(dist));

// SPA fallback: cualquier ruta no encontrada sirve index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Web sirviendo en puerto ${PORT}`));
  
