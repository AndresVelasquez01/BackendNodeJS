const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// Clave secreta para firmar los tokens JWT
const SECRET_KEY = 'mi_secreto';

// Crear la app de Express
const app = express();

// Crear la cadena de conexión a MongoDB en Atlas
const uri = "mongodb+srv://andresfv:izNhtqRbC1rBcQJI@afvcluster0.7fmex.mongodb.net/?retryWrites=true&w=majority&appName=AFVCluster0";

// Middleware
app.use(cors());
app.use(express.json()); // Para parsear el body en JSON


/*
// Conectar a MongoDB, cuando MongoDB está localmente instalado
mongoose.connect('mongodb://localhost:27017/miapp', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar a MongoDB', err));
*/


mongoose.connect(uri)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectarse a MongoDB Atlas', err));


// Definir el esquema y modelo de Usuario
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Verificar si el usuario ya existe
    const userExistente = await User.findOne({ username });
    if (userExistente) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear y guardar el nuevo usuario
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Usuario registrado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar usuario', error });
  }
});

// Ruta de autenticación y emisión de JWT
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Buscar el usuario en la base de datos
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    // Crear el JWT
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error en la autenticación', error });
  }
});

// Ruta protegida que requiere autenticación con JWT
app.get('/perfil', (req, res) => {
  
  let token = req.headers['authorization'];
  
 
  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado'});
  }

  // Remueve el prefijo "Bearer " si está presente
  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length); // Elimina "Bearer "
  }

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, SECRET_KEY);
    res.json({ message: `Bienvenido ${decoded.username}`, user: decoded.username });
  } catch (error) {
    res.status(401).json({ message: 'Token no válido'});
  }
});

// Iniciar el servidor en el puerto 5000
app.listen(5000, () => {
  console.log('Servidor corriendo en el puerto 5000');
});
