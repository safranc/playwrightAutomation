const { test } = require('@playwright/test');
const FileFactory = require('../helpers/fileFactory');
const UploadFlow = require('../helpers/uploadFlowHelper');

// Reset the test state before each test and clean up local storage after each test
test.beforeEach(async ({ request }) => UploadFlow.resetTestState(request));
test.afterEach(async () => UploadFlow.resetLocalStorage());

// Iterate over all accepted file types and run the upload/resubmit/email flow test for each file type
for (const fileType of FileFactory.ACCEPTED_FILE_TYPES) {
  test(`upload/resubmit/email flow works for ${fileType.label}`, async ({ page, request }) => {
    const { studentId, assignmentId, studentEmail } = UploadFlow.buildScenarioData(fileType);
    const { v1File, v2File, expectedV1Stored, expectedV2Stored } = await UploadFlow.prepareUploadFiles(fileType, studentId);

    try {
      await UploadFlow.openSubmissionPage(page);
      await UploadFlow.fillSubmissionForm(page, { studentId, assignmentId, studentEmail });

      await UploadFlow.uploadFile(page, v1File.path);
      await UploadFlow.verifyUiUploadState(page, {
        statusMessage: 'Submission uploaded successfully and email sent.',
        originalFileName: v1File.name,
        storedFileName: expectedV1Stored,
      });

      const firstSubmission = await UploadFlow.fetchSubmission(request, studentId, assignmentId);
      UploadFlow.verifySubmissionRecord(firstSubmission, {
        originalFileName: v1File.name,
        storedFileName: expectedV1Stored,
        sizeBytes: v1File.sizeBytes,
      });

      await UploadFlow.uploadFile(page, v2File.path);
      await UploadFlow.verifyUiUploadState(page, {
        statusMessage: 'Submission replaced successfully and email sent.',
        originalFileName: v2File.name,
        storedFileName: expectedV2Stored,
      });

      const latestSubmission = await UploadFlow.fetchSubmission(request, studentId, assignmentId);
      UploadFlow.verifySubmissionRecord(latestSubmission, {
        originalFileName: v2File.name,
        storedFileName: expectedV2Stored,
        sizeBytes: v2File.sizeBytes,
      });

      await UploadFlow.verifyResubmissionEmail(request, v2File.name, studentId);
    } finally {
      await FileFactory.cleanup(v1File.path);
      await FileFactory.cleanup(v2File.path);
    }
  });
}
