const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { number } = require('yup');

// Clave secreta para firmar los tokens JWT
const SECRET_KEY = 'mi_secreto';

// Crear la app de Express
const app = express();
const PORT = 5000;

// Habilitar CORS para todas las rutas
app.use(cors());

// Middleware para analizar JSON en las solicitudes
app.use(express.json());

// Crear la cadena de conexión a MongoDB en Atlas
const uri = "mongodb+srv://andresfv:izNhtqRbC1rBcQJI@afvcluster0.7fmex.mongodb.net/?retryWrites=true&w=majority&appName=AFVCluster0";

mongoose.connect(uri)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error al conectarse a MongoDB Atlas', err));


/************************************************************************************************/
/* BLOQUE PARA MANEJO DE LA AUTENTICACIÓN */
/************************************************************************************************/

// Definir el esquema y modelo de Usuario
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Ruta de registro de usuario
app.post('/register', async (req, res) => {

  console.log("Llamada a: ", "app.post('/register', async (req, res) => {");

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

  console.log("Llamada a: ", "app.post('/login', async (req, res) => {");

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
  
  console.log("Llamada a: ", "app.get('/perfil', (req, res) => {");

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

/************************************************************************************************/
/* BLOQUE PARA MANEJO DEL CRUD */
/************************************************************************************************/

// Modelo de ejemplo en MongoDB
const ItemSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  detalles: String,
  cantidad: Number,
  email: String
});
const Item = mongoose.model('Item', ItemSchema);

const PedidoSchema = new mongoose.Schema({
  producto: { type: String, required: true },
  cantidad: { type: Number, required: true },
  precio: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
});

const Pedido = mongoose.model('Pedido', PedidoSchema);

//const Pedido = require('./models/Pedido'); // Importa el modelo de Pedido

// Rutas CRUD

// Crear un nuevo documento (CREATE)
app.post('/items', async (req, res) => {

  console.log("Llamada a: ", "app.post('/items', async (req, res) => {");

  try {
    const nuevoItem = new Item(req.body);
    const itemGuardado = await nuevoItem.save();
    res.status(201).json(itemGuardado);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear el item' });
  }
});

// Ruta para obtener todos los documentos (READ - Todos los elementos)
app.get('/items', async (req, res) => {

  console.log("Llamada a: ", "app.get('/items', async (req, res) => {");

  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los items' });
  }
});

// Ruta para obtener un solo documento por id (READ - Un elemento)
app.get('/items/:id', async (req, res) => {

  console.log("Llamada a: ", "app.get('/items/:id', async (req, res) => {");

  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el item' });
  }
});

// Actualizar un documento (UPDATE)
app.put('/items/:id', async (req, res) => {

  console.log("Llamada a: ", "app.put('/items/:id', async (req, res) => {");

  try {
    const itemActualizado = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!itemActualizado) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(itemActualizado);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar el item' });
  }
});

// Eliminar un documento (DELETE)
app.delete('/items/:id', async (req, res) => {

  console.log("Llamada a: ", "app.delete('/items/:id', async (req, res) => {");

  try {
    const itemEliminado = await Item.findByIdAndDelete(req.params.id);
    if (!itemEliminado) return res.status(404).json({ error: 'Item no encontrado' });
    res.json({ message: 'Item eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el item' });
  }
});

// Endpoint para validar correo electrónico
app.post('/validate-email', async (req, res) => {

  console.log("Llamada a: ", "app.post('/validate-email', async (req, res) => {");

  try {
    const { email, id } = req.body; // Obtenemos el correo y el ID desde el cuerpo de la solicitud

    if (!email) {
      return res.status(400).json({ isValid: false, message: 'El correo es obligatorio y no fue proporcionado.' });
    }

    // Buscar en la colección "items" si existe un documento con este correo
    const existingItem = await Item.findOne({ email }); // También puede ser await Item.findOne({ email: email });

    // Verifica si existe un registro con el correo
    if (existingItem) {
      // Si existe un registro con ese correo, verifica que no sea el mismo registro en edición
      if (existingItem.id !== id) {
        return res.status(200).json({ isValid: false, message: 'El correo ya está registrado.' });
      }
    }

    // Si no se encuentra ningún conflicto, el correo es válido
    return res.status(200).json({ isValid: true });

  } catch (error) {
    console.error('Error al validar el correo:', error);
    res.status(500).json({ isValid: false, message: 'Error interno del servidor.' });
  }
});

// Endpoint para Guardar Múltiples Ítems, ejemplo de formularios dinámicos
app.post('/pedidos/batch', async (req, res) => {

  console.log("Llamada a: ", "app.post('/pedidos/batch', async (req, res) => {");

  try {
    const nuevosPedidos = req.body; // Array de pedidos que llega del frontend
    const pedidosInsertados = await Pedido.insertMany(nuevosPedidos); // Inserta todos los pedidos
    res.status(201).json({ message: 'Pedidos guardados con éxito', pedidosInsertados });
  } catch (error) {
    console.error('Error al guardar los pedidos:', error);
    res.status(500).json({ message: 'Error al guardar los pedidos', error });
  }
});

app.get('/form-fields', (req, res) => {

  console.log("Llamada a: ", "app.get('/form-fields', (req, res) => {");

  const fields = [
    { id: 1, name: 'firstName', label: 'Nombre', required: true },
    { id: 2, name: 'lastName', label: 'Apellido', required: true },
    { id: 3, name: 'email', label: 'Correo Electrónico', required: true },
    { id: 4, name: 'address', label: 'Dirección de residencia', required: true },
    { id: 5, name: 'cellphone', label: 'Celular', required: true },
    { id: 6, name: 'whatsapp', label: 'Whatsapp', required: true },
  ];
  res.json(fields);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
