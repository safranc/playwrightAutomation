# OVS QA Upload Test App

This project is a small local app for testing file upload, resubmission, and email-notification flows with Playwright.

## Install

From the `OVS_qaTest` folder, install dependencies once:

```bash
npm install
```

## Start the server

Run the local app with:

```bash
npm start
```

The server starts on `http://127.0.0.1:3000` by default.

Open that URL in your browser to use the form.

## About the form

The page contains four fields:

- Student ID
- Assignment ID
- Student Email
- File upload

The upload field accepts these file types:

- PDF
- DOCX
- JPG
- PNG

The form sends the file to the local API and shows the latest submission on the page. If the same student uploads again for the same assignment, the new file replaces the previous one.

### Email notifications

When a file is successfully uploaded, the server sends an **email notification** to the teacher (default: `noreply@ovs-qatest.local`). The email contains:

- Student ID
- Assignment ID
- File name
- Submission status (new submission or resubmission)
- Timestamp

The email system uses **Nodemailer with a JSON transport** for testing, which stores emails in an in-memory outbox. This ensures tests can verify that emails were sent without depending on external email services.

Tests access the outbox via the `/api/test/outbox` endpoint and reset it before each test for a clean state.

#### Viewing test emails

**Via the test helper functions** (in Playwright tests):
```javascript
// Check how many emails were sent
await verifyOutboxCount(request, 1, studentId);

// Verify resubmission email details
await verifyResubmissionEmail(request, expectedFileName, studentId);
```

**Via the API endpoint** (during manual testing):
1. Start the server: `npm start`
2. Upload a file through the form
3. In another terminal, view the email outbox:
```bash
curl http://127.0.0.1:3000/api/test/outbox
```

This returns JSON with all sent emails:
```json
{
  "messages": [
    {
      "id": "1234567890",
      "to": "noreply@ovs-qatest.local",
      "subject": "[OVS QA] Assignment submitted: math_unit_1",
      "text": "Student ID: student_123\nStudent Email: student@example.com\nAssignment ID: math_unit_1\nFile: document.pdf\nStatus: New submission\nTimestamp: 2026-07-18T10:30:00.000Z",
      "sentAt": "2026-07-18T10:30:00.000Z"
    }
  ]
}
```

## Run the tests

Run the Playwright tests with:

```bash
npx playwright test
```

You can also use the npm script:

```bash
npm test
```

## Scenarios covered

The test suite covers these flows:

1. **Successful upload and resubmission for all accepted file types** — Uploads a file, verifies it's saved correctly, then uploads a new version and verifies the old one is replaced.
2. **File name storage verification** — Confirms the saved file uses the `studentId + extension` naming rule.
3. **Email verification** — Verifies that:
   - An email is sent when the first file is uploaded
   - A second email is sent with "resubmitted" status when a new file replaces the old one
   - Each email contains the correct file name and student information
4. **Unsupported file type validation** — Attempts to upload a `.txt` file and verifies the server rejects it with an error message.
5. **File size validation** — Attempts to upload a file larger than 10 MB and verifies the server rejects it with an error message.

## Useful notes

- The app stores submission data locally in `data/submissions.json`.
- Uploaded files are written to the local `uploads/` folder.
- Email notifications are stored in an in-memory outbox during testing via `/api/test/outbox` endpoint.
- The Playwright suite resets local test state (submissions, uploaded files, and email outbox) before each run to ensure test isolation.