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

1. Successful upload and resubmission for all accepted file types.
2. Saved file name verification using the `studentId + extension` rule.
3. Email notification checks for the initial upload and the resubmission.
4. Validation for unsupported file types.
5. Validation for files larger than 10 MB.

## Useful notes

- The app stores submission data locally in `data/submissions.json`.
- Uploaded files are written to the local `uploads/` folder.
- The Playwright suite resets local test state before each run.