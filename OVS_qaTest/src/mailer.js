const nodemailer = require('nodemailer');

const outbox = [];

function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  // Default JSON transport keeps tests self-contained and deterministic.
  return nodemailer.createTransport({ jsonTransport: true });
}

const transport = createTransport();

async function sendUploadEmail({
  studentEmail,
  teacherEmail,
  studentId,
  assignmentId,
  fileName,
  isResubmission,
}) {
  const subject = `[OVS QA] Assignment ${isResubmission ? 'resubmitted' : 'submitted'}: ${assignmentId}`;
  const text = [
    `Student ID: ${studentId}`,
    `Student Email: ${studentEmail}`,
    `Assignment ID: ${assignmentId}`,
    `File: ${fileName}`,
    `Status: ${isResubmission ? 'Replaced previous submission' : 'New submission'}`,
    `Timestamp: ${new Date().toISOString()}`,
  ].join('\n');

  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@ovs-qatest.local',
    to: teacherEmail,
    subject,
    text,
  });

  outbox.push({
    id: String(info.messageId || Date.now()),
    to: teacherEmail,
    subject,
    text,
    sentAt: new Date().toISOString(),
  });

  return info;
}

function getOutbox() {
  return outbox;
}

function clearOutbox() {
  outbox.length = 0;
}

module.exports = {
  sendUploadEmail,
  getOutbox,
  clearOutbox,
};
