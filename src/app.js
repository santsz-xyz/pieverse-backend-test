const express = require('express');
const tasksRouter = require('./routes/tasks');

function createApp() {
  const app = express();

  app.use(express.json());

  app.use('/tasks', tasksRouter);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

module.exports = createApp;

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Bad Request: Malformed JSON' });
  }
  next(err);
});
