const fs = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'submissions.json');

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, '{}', 'utf8');
  }
}

async function readAll() {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw || '{}');
}

async function writeAll(data) {
  await ensureDataFile();
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

function makeKey(studentId, assignmentId) {
  return `${studentId}::${assignmentId}`;
}

async function getSubmission(studentId, assignmentId) {
  const all = await readAll();
  return all[makeKey(studentId, assignmentId)] || null;
}

async function upsertSubmission(submission) {
  const all = await readAll();
  all[makeKey(submission.studentId, submission.assignmentId)] = submission;
  await writeAll(all);
  return submission;
}

module.exports = {
  getSubmission,
  upsertSubmission,
};
