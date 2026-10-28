
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Permitir la comunicación con Angular
app.use(cors({
  origin: 'http://localhost:4200'
}));

// Permitir recibir datos JSON
app.use(express.json());

// Ruta de prueba de MediCore
app.get('/api', (req, res) => {
  res.json({
    mensaje: 'Bienvenido a la API de MediCore',
    estado: 'Servidor funcionando correctamente'
  });
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MediCore API funcionando en http://localhost:${PORT}`);
});
