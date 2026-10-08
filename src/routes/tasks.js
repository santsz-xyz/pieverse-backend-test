const express = require('express');
const store = require('../store');

const router = express.Router();

// --- FEATURE 4: Auth Middleware ---
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  // Menggunakan env var, fallback ke 'pieverse-secret' untuk testing lokal
  const validKey = process.env.API_KEY || 'pieverse-secret';
  
  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

// --- FEATURE 3: Rate Limiting Middleware ---
const rateLimits = new Map();
const WINDOW_MS = 60 * 1000; // 1 menit window
const MAX_REQUESTS = 10; // Maksimal 10 request per IP per menit

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 1, startTime: now });
  } else {
    const limitData = rateLimits.get(ip);
    if (now - limitData.startTime < WINDOW_MS) {
      limitData.count++;
      if (limitData.count > MAX_REQUESTS) {
        return res.status(429).json({ error: 'Too Many Requests' });
      }
    } else {
      rateLimits.set(ip, { count: 1, startTime: now });
    }
  }
  next();
};

// --- FEATURE 1: Input Validation Middleware ---
const validateTaskInput = (req, res, next) => {
  const { title } = req.body;
  if (title === undefined || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Bad Request: "title" is required and must be a non-empty string' });
  }
  next();
};

// Gabungkan middleware untuk proteksi endpoint Write
const writeMiddlewares = [rateLimiter, authMiddleware];

// GET /tasks (Feature 2: Pagination ditambahkan)
router.get('/', async (req, res, next) => {
  try {
    const tasks = await store.getAll();
    
    // Pagination logic
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : tasks.length;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    
    if (isNaN(limit) || isNaN(offset) || limit < 0 || offset < 0) {
       return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const paginatedTasks = tasks.slice(offset, offset + limit);
    res.json(paginatedTasks);
  } catch (error) {
    next(error);
  }
});

// POST /tasks (Bug Fix: Async logic diperbaiki, tidak return placeholder)
router.post('/', writeMiddlewares, validateTaskInput, async (req, res, next) => {
  try {
    const { title } = req.body;
    const task = await store.insert(title.trim());
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// PUT /tasks/:id (Bug Fix: Cegah overwrite ID dan field lain yang tidak diizinkan)
router.put('/:id', writeMiddlewares, validateTaskInput, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid task ID' });

    // Hanya ambil property yang diizinkan untuk diubah
    const changes = {
      title: req.body.title.trim()
    };
    
    if (req.body.completed !== undefined) {
      if (typeof req.body.completed !== 'boolean') {
         return res.status(400).json({ error: '"completed" must be a boolean' });
      }
      changes.completed = req.body.completed;
    }

    const updated = await store.update(id, changes);

    if (!updated) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /tasks/:id
router.delete('/:id', writeMiddlewares, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid task ID' });

    const deleted = await store.remove(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;