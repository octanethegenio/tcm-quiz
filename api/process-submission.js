import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.EMAIL_API_KEY,
});

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { name, email, age, gender, location, primaryType, primaryScore } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and Email are required' });
    }

    // --- Store Stats Data in Google Sheet ---
    if (process.env.SHEET_WEBHOOK_URL) {
      console.log('Attempting to send data to Google Sheet webhook (async):', process.env.SHEET_WEBHOOK_URL);
      const sheetData = { name, email, age, gender, location, primaryType, primaryScore };
      console.log('Sheet Data Payload:', JSON.stringify(sheetData));

      // Fire-and-forget: We don't wait for Google Sheets to respond
      fetch(process.env.SHEET_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetData)
      }).catch((err) => {
        // Log errors related to *initiating* the request only
        console.error('!!! ERROR initiating fetch call to Google Sheet:', err);
      });
      // No await, no response checking here

      console.log('Sent request to Google Sheet webhook; Vercel function proceeding.');

    } else {
      console.log('SHEET_WEBHOOK_URL environment variable is not set. Skipping Google Sheet logging.');
    }
    // --- End storage ---

    const pdfLinkEn = process.env.PDF_URL_EN;
    const pdfLinkZh = process.env.PDF_URL_ZH;
    const fromEmailAddress = process.env.FROM_EMAIL;
    const fromName = "Elizabeth Yau";

    if (!pdfLinkEn || !pdfLinkZh || !fromEmailAddress || !process.env.EMAIL_API_KEY) {
         console.error("Missing required environment variables.");
         return res.status(500).json({ success: false, error: 'Server configuration error.' });
    }

    const sentFrom = new Sender(fromEmailAddress, fromName);
    const recipients = [new Recipient(email, name)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Your TCM Body Type Report Is Here!')
      .setText(`Hello there,\n\nThanks for filling out the Traditional Chinese Medicine (TCM) body type questionnaire.\n\nYour full report is available via the links below. It covers all nine body types – just find yours and have a read.\n\nBoth English and Chinese versions are included for your convenience:\n\nEnglish Guide: ${pdfLinkEn}\n中文小手冊： ${pdfLinkZh}\n\nIf you know someone who'd like to discover their body type too, feel free to share this link: elizabethyau.com/bodytype\n\nWishing you good health, happiness, and a radiant glow from the inside out!\n\nWarmest wishes,\n\nElizabeth Yau\nRegistered Traditional Chinese Medicine Practitioner\nBased in Hong Kong`)
      
      .setHtml(`<p>Hello there,</p>
        <p>Thanks for filling out the Traditional Chinese Medicine (TCM) body type questionnaire.</p>
        <p>Your full report is available via the links below. It covers all nine body types – just find yours and have a read.</p>
        <p>Simply click the links to view or download the PDF.</p>
        <p>Both English and Chinese versions are included for your convenience:</p>
        <ul>
          <li>English Guide: <a href="${pdfLinkEn}">English_TCMBodyType_Elizabeth</a></li>
          <li>中文小手冊： <a href="${pdfLinkZh}">Chinese_TCMBodyType_Elizabeth</a></li>
        </ul>
        <p>If you know someone who'd like to discover their body type too, feel free to share this link: <a href="http://elizabethyau.com/bodytype">elizabethyau.com/bodytype</a></p>
        <p>Wishing you good health, happiness, and a radiant glow from the inside out!</p>
        <p>Warmest wishes,</p>
        <p><strong>Elizabeth Yau</strong><br>Registered Traditional Chinese Medicine Practitioner<br>Based in Hong Kong</p>`);

    await mailerSend.email.send(emailParams);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing submission:', error?.response?.body || error?.message || error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
}