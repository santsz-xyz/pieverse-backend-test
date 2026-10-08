// A tiny in-memory "database" so this API can run standalone.
// simulateLatency() stands in for a real async DB round-trip.

let tasks = [
  { id: 1, title: 'Read the task description carefully', completed: true },
  { id: 2, title: 'Find the bugs in Part 1', completed: false },
];

let nextId = 3;

function simulateLatency() {
  return new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 40));
}

async function getAll() {
  await simulateLatency();
  return tasks.map((t) => ({ ...t }));
}

async function getById(id) {
  await simulateLatency();
  return tasks.find((t) => t.id === id);
}

async function insert(title) {
  // FIX: Klaim dan naikkan ID secara sinkronus sebelum proses await (mencegah race condition)
  const id = nextId;
  nextId += 1; 
  
  await simulateLatency(); // simulates the round-trip to persist the new row

  const task = { id, title, completed: false };
  tasks.push(task);
  return task;
}

async function update(id, changes) {
  await simulateLatency();
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  Object.assign(task, changes);
  return task;
}

async function remove(id) {
  await simulateLatency();
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== id);
  return tasks.length < before;
}

module.exports = { getAll, getById, insert, update, remove };