const { expect } = require('@playwright/test');
const fs = require('fs/promises');
const path = require('path');
const FileFactory = require('./fileFactory');

const projectRoot = path.join(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');
const submissionsFile = path.join(projectRoot, 'data', 'submissions.json');


// Builds the normalized stored filename using student ID plus file extension.
function expectedStoredName(studentId, extension) {
  return `${studentId}${extension.toLowerCase()}`;
}

// Creates unique student and assignment data for a test scenario.
function buildScenarioData(fileType) {
  const unique = `${Date.now()}_${fileType.label.toLowerCase()}`;

  return {
    studentId: `student_${unique}`,
    assignmentId: 'math_unit_1',
    studentEmail: 'student@example.com',
  };
}

// Prepares the unsupported file type scenario input used by negative tests.
function buildInvalidTypeScenario() {
  const scenarioData = buildScenarioData({ label: 'TXT' });

  return {
    ...scenarioData,
    fileConfig: {
      name: 'user-upload-invalid-type',
      extension: '.txt',
      size: '64KB',
      mimeType: 'text/plain',
    },
  };
}

// Prepares the oversized file scenario input used by negative tests.
function buildOversizedFileScenario() {
  const scenarioData = buildScenarioData({ label: 'OVERSIZE' });

  return {
    ...scenarioData,
    fileConfig: {
      name: 'user-upload-over-10mb',
      type: 'application/pdf',
      size: '11MB',
    },
  };
}

// Creates the first and second upload files used in the resubmission flow.
async function prepareUploadFiles(fileType, studentId) {
  const v1File = await FileFactory.create({
    name: `user-upload-v1-${fileType.label.toLowerCase()}`,
    type: fileType.mimeType,
    size: '256KB',
  });

  const v2File = await FileFactory.create({
    name: `user-upload-v2-${fileType.label.toLowerCase()}`,
    type: fileType.mimeType,
    size: '512KB',
  });

  return {
    v1File,
    v2File,
    expectedV1Stored: expectedStoredName(studentId, v1File.extension),
    expectedV2Stored: expectedStoredName(studentId, v2File.extension),
  };
}

// Clears the in-memory email outbox before a test starts.
async function resetOutbox(request) {
  await request.delete('/api/test/outbox');
}

// Deletes every file and folder inside a target directory while keeping the directory itself.
async function clearDirectoryContents(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  await Promise.all(
    entries.map((entry) => fs.rm(path.join(dirPath, entry.name), { recursive: true, force: true }))
  );
}

// Resets the submissions JSON file back to an empty object.
async function clearSubmissionsStore() {
  await fs.mkdir(path.dirname(submissionsFile), { recursive: true });
  await fs.writeFile(submissionsFile, '{}', 'utf8');
}

// Removes all stored uploaded files from the local uploads folder.
async function clearUploadedFiles() {
  await clearDirectoryContents(uploadsDir);
}

// Clears both saved submission records and uploaded files from local storage.
async function resetLocalStorage() {
  await Promise.all([clearSubmissionsStore(), clearUploadedFiles()]);
}

// Resets both the email outbox and local file/data storage for a clean test start.
async function resetTestState(request) {
  await resetOutbox(request);
  await resetLocalStorage();
}

// Opens the assignment submission page.
async function openSubmissionPage(page) {
  await page.goto('/');
}

// Fills in the student, assignment, and email fields on the upload form.
async function fillSubmissionForm(page, { studentId, assignmentId, studentEmail }) {
  await page.getByLabel('Student ID').fill(studentId);
  await page.getByLabel('Assignment ID').fill(assignmentId);
  await page.getByLabel('Student Email').fill(studentEmail);
}

// Uploads a file through the file input and submits the form.
async function uploadFile(page, filePath) {
  await page.locator('#fileInput').setInputFiles(filePath);
  await page.locator('#submitBtn').click();
}

// Verifies the successful upload UI state, including status and displayed file names.
async function verifyUiUploadState(page, { statusMessage, originalFileName, storedFileName }) {
  await expect(page.locator('#message')).toContainText(statusMessage);
  await expect(page.locator('#latestOriginalFile')).toHaveText(originalFileName);
  await expect(page.locator('#latestFile')).toHaveText(storedFileName);
}

// Verifies the error message shown for an invalid upload attempt.
async function verifyUiErrorState(page, expectedErrorMessage) {
  await expect(page.locator('#message')).toContainText(expectedErrorMessage);
}

// Fetches the latest saved submission record for a student and assignment.
async function fetchSubmission(request, studentId, assignmentId) {
  const response = await request.get(
    `/api/submissions/${encodeURIComponent(studentId)}/${encodeURIComponent(assignmentId)}`
  );

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.submission;
}

// Checks that a submission record matches the expected file name, stored name, and size.
function verifySubmissionRecord(submission, { originalFileName, storedFileName, sizeBytes }) {
  expect(submission.fileName).toBe(originalFileName);
  expect(submission.storedFileName).toBe(storedFileName);
  expect(submission.size).toBe(sizeBytes);
}

// Filters email messages so assertions only consider those for the active student.
function filterOutboxMessagesByStudent(messages, studentId) {
  if (!studentId) {
    return messages;
  }

  return messages.filter((message) => String(message.text || '').includes(`Student ID: ${studentId}`));
}

// Verifies that the resubmission email was sent with the expected file information.
async function verifyResubmissionEmail(request, expectedFileName, studentId) {
  const outboxResponse = await request.get('/api/test/outbox');
  expect(outboxResponse.ok()).toBeTruthy();

  const outbox = await outboxResponse.json();
  const scopedMessages = filterOutboxMessagesByStudent(outbox.messages || [], studentId);

  expect(scopedMessages).toHaveLength(2);
  expect(scopedMessages[1].subject).toContain('resubmitted');
  expect(scopedMessages[1].text).toContain(expectedFileName);
}

// Verifies how many outbox emails exist for the active student.
async function verifyOutboxCount(request, expectedCount, studentId) {
  const outboxResponse = await request.get('/api/test/outbox');
  expect(outboxResponse.ok()).toBeTruthy();

  const outbox = await outboxResponse.json();
  const scopedMessages = filterOutboxMessagesByStudent(outbox.messages || [], studentId);
  expect(scopedMessages).toHaveLength(expectedCount);
}

module.exports = {
  buildScenarioData,
  buildInvalidTypeScenario,
  buildOversizedFileScenario,
  prepareUploadFiles,
  expectedStoredName,
  resetOutbox,
  clearSubmissionsStore,
  clearUploadedFiles,
  resetLocalStorage,
  resetTestState,
  openSubmissionPage,
  fillSubmissionForm,
  uploadFile,
  verifyUiUploadState,
  verifyUiErrorState,
  fetchSubmission,
  verifySubmissionRecord,
  verifyResubmissionEmail,
  verifyOutboxCount,
};
