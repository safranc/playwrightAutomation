const { test } = require('@playwright/test');
const FileFactory = require('../helpers/fileFactory');
const UploadFlow = require('../helpers/uploadFlowHelper');

// Reset the test state before each test and clean up local storage after each test
test.beforeEach(async ({ request }) => UploadFlow.resetTestState(request));
test.afterEach(async () => UploadFlow.resetLocalStorage());

// test for unsupported file type
test('shows validation error for unsupported file type', async ({ page, request }) => {
  const { studentId, assignmentId, studentEmail, fileConfig } = UploadFlow.buildInvalidTypeScenario();
  const invalidFile = await FileFactory.createCustom(fileConfig);

  try {
    await UploadFlow.openSubmissionPage(page);
    await UploadFlow.fillSubmissionForm(page, { studentId, assignmentId, studentEmail });

    await UploadFlow.uploadFile(page, invalidFile.path);
    await UploadFlow.verifyUiErrorState(page, 'Unsupported file type');
    await UploadFlow.verifyOutboxCount(request, 0, studentId);
  } finally {
    await FileFactory.cleanup(invalidFile.path);
  }
});

// test for file size exceeding 10 MB
test('shows validation error for files larger than 10 MB', async ({ page, request }) => {
  const { studentId, assignmentId, studentEmail, fileConfig } = UploadFlow.buildOversizedFileScenario();
  const oversizedFile = await FileFactory.create(fileConfig);

  try {
    await UploadFlow.openSubmissionPage(page);
    await UploadFlow.fillSubmissionForm(page, { studentId, assignmentId, studentEmail });

    await UploadFlow.uploadFile(page, oversizedFile.path);
    await UploadFlow.verifyUiErrorState(page, 'Max file size is 10 MB.');
    await UploadFlow.verifyOutboxCount(request, 0, studentId);
  } finally {
    await FileFactory.cleanup(oversizedFile.path);
  }
});
