// server/package.json
{
  "name": "streamconnect-server",
  "version": "1.0.0",
  "description": "Servidor de streaming para StreamConnect",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "node-media-server": "^2.3.8",
    "mongoose": "^6.0.12",
    "socket.io": "^4.4.1",
    "jsonwebtoken": "^8.5.1",
    "bcryptjs": "^2.4.3",
    "dotenv": "^10.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.15"
  }
}

// server/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const NodeMediaServer = require('node-media-server');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configuración de RTMP y HTTP
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media'
  }
};

// Iniciar servidor de medios
const nms = new NodeMediaServer(config);
nms.run();

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Rutas
app.use('/api/streams', require('./routes/streams'));
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));

// Manejo de Websockets
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-stream', (streamId) => {
    socket.join(streamId);
    console.log(`Usuario unido al stream: ${streamId}`);
  });

  socket.on('chat-message', (data) => {
    io.to(data.streamId).emit('new-message', {
      user: data.user,
      message: data.message,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});

// server/models/Stream.js
const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  streamKey: {
    type: String,
    unique: true,
    required: true
  },
  isLive: {
    type: Boolean,
    default: false
  },
  viewers: {
    type: Number,
    default: 0
  },
  startedAt: Date,
  endedAt: Date,
  category: String,
  tags: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('Stream', streamSchema);

// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  streamKey: {
    type: String,
    unique: true
  },
  isStreamer: {
    type: Boolean,
    default: false
  },
  qopBalance: {
    type: Number,
    default: 0
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

// server/routes/streams.js
const express = require('express');
const router = express.Router();
const Stream = require('../models/Stream');
const auth = require('../middleware/auth');

// Obtener streams activos
router.get('/live', async (req, res) => {
  try {
    const streams = await Stream.find({ isLive: true })
      .populate('userId', 'username')
      .sort('-viewers');
    res.json(streams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Iniciar stream
router.post('/start', auth, async (req, res) => {
  try {
    const stream = new Stream({
      userId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      streamKey: req.user.streamKey,
      isLive: true,
      startedAt: new Date(),
      category: req.body.category,
      tags: req.body.tags
    });

    const savedStream = await stream.save();
    res.status(201).json(savedStream);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Finalizar stream
router.post('/end/:streamId', auth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.streamId);
    if (!stream) return res.status(404).json({ message: 'Stream no encontrado' });
    
    stream.isLive = false;
    stream.endedAt = new Date();
    await stream.save();
    
    res.json({ message: 'Stream finalizado' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'Acceso denegado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Token inválido' });
  }
};

// server/.env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/streamconnect
JWT_SECRET=tu_secreto_jwt
RTMP_PORT=1935
HTTP_PORT=8000

// server/utils/streamKeyGenerator.js
const crypto = require('crypto');

function generateStreamKey() {
  return crypto.randomBytes(20).toString('hex');
}

module.exports = generateStreamKey;
