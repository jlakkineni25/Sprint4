const sampleDocument = `Dear John Mercer,

Your appointment at Acme Corp has been confirmed for March 14th.
Please call us at 555-867-5309 to confirm your attendance.
Your case number is CN-2021-4492 and your date of birth on
file is 09/12/1985. We will contact you at john.mercer@email.com
if anything changes.

Regards,
Dr. Patricia Holt
Riverside Medical Center`;

const mockSpans = [
  { id: "1", text: "John Mercer", type: "NAME", confidence: 0.97, reason: "Full name of an individual", status: "unreviewed" },
  { id: "2", text: "Acme Corp", type: "ORG", confidence: 0.61, reason: "Detected as organization name — but may be public/non-sensitive", status: "unreviewed", flaggedFalsePositive: true },
  { id: "3", text: "March 14th", type: "DATE", confidence: 0.52, reason: "Date that may relate to a personal appointment", status: "unreviewed" },
  { id: "4", text: "09/12/1985", type: "DOB", confidence: 0.99, reason: "Date of birth — highly sensitive PII", status: "unreviewed" },
  { id: "5", text: "john.mercer@email.com", type: "EMAIL", confidence: 0.99, reason: "Personal email address", status: "unreviewed" },
  { id: "6", text: "Patricia Holt", type: "NAME", confidence: 0.95, reason: "Full name of a medical professional", status: "unreviewed" },
  { id: "7", text: "555-867-5309", type: "PHONE", confidence: 0.99, reason: null, status: "missed" },
  { id: "8", text: "CN-2021-4492", type: "CASE_ID", confidence: 0.99, reason: null, status: "missed" },
];

module.exports = { sampleDocument, mockSpans };