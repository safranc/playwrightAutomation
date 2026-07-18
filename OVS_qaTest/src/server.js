const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');

const { getSubmission, upsertSubmission } = require('./store');
const { sendUploadEmail, getOutbox, clearOutbox } = require('./mailer');

const app = express();
const port = Number(process.env.PORT || 3000);
const uploadsDir = path.join(__dirname, '..', 'uploads');

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);

const allowedExtensions = new Set(['.pdf', '.docx', '.jpg', '.jpeg', '.png']);

function sanitize(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(mime)) {
      cb(new Error('Unsupported file type. Allowed types: PDF, DOCX, JPG, PNG.'));
      return;
    }

    cb(null, true);
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/submissions/:studentId/:assignmentId', async (req, res) => {
  const submission = await getSubmission(req.params.studentId, req.params.assignmentId);
  if (!submission) {
    res.status(404).json({ message: 'Submission not found.' });
    return;
  }

  res.json({ submission });
});

app.post('/api/submissions', upload.single('file'), async (req, res, next) => {
  try {
    const { studentId, assignmentId, studentEmail } = req.body;
    const uploadedFile = req.file;

    if (!studentId || !assignmentId || !studentEmail || !uploadedFile) {
      if (uploadedFile?.path) {
        await fs.rm(uploadedFile.path, { force: true });
      }
      res.status(400).json({ message: 'studentId, assignmentId, studentEmail and file are required.' });
      return;
    }

    const previous = await getSubmission(studentId, assignmentId);

    const safeStudentId = sanitize(studentId);
    const safeAssignmentId = sanitize(assignmentId);
    const ext = path.extname(uploadedFile.originalname || '').toLowerCase();
    const storedFileName = `${safeStudentId}${ext}`;
    const assignmentUploadDir = path.join(uploadsDir, safeAssignmentId);
    const targetPath = path.join(assignmentUploadDir, storedFileName);

    await fs.mkdir(assignmentUploadDir, { recursive: true });

    if (previous?.storagePath && previous.storagePath !== uploadedFile.path) {
      await fs.rm(previous.storagePath, { force: true });
    }

    // Replace any existing file for this student within the assignment.
    await fs.rm(targetPath, { force: true });
    await fs.rename(uploadedFile.path, targetPath);

    const submission = {
      studentId,
      assignmentId,
      studentEmail,
      fileName: uploadedFile.originalname,
      storedFileName,
      storagePath: targetPath,
      mimeType: uploadedFile.mimetype,
      size: uploadedFile.size,
      submittedAt: new Date().toISOString(),
    };

    await upsertSubmission(submission);

    await sendUploadEmail({
      studentEmail,
      teacherEmail: process.env.TEACHER_EMAIL || 'teacher@ovs-qatest.local',
      studentId,
      assignmentId,
      fileName: uploadedFile.originalname,
      storedFileName,
      isResubmission: Boolean(previous),
    });

    res.json({
      message: previous
        ? 'Submission replaced successfully and email sent.'
        : 'Submission uploaded successfully and email sent.',
      submission,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/test/outbox', (_req, res) => {
  res.json({ messages: getOutbox() });
});

app.delete('/api/test/outbox', (_req, res) => {
  clearOutbox();
  res.status(204).send();
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ message: 'Max file size is 10 MB.' });
    return;
  }

  if (error?.message?.includes('Unsupported file type')) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: error.message || 'Unexpected server error.' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`OVS QA Test app running at http://127.0.0.1:${port}`);
  });
}

module.exports = { app };
