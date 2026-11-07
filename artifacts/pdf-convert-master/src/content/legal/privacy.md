---
title: Privacy Policy
description: What personal data PDF Genius collects on the website and Android app, why, who processes it, how long files are kept, and how to use your privacy rights.
---

## 1. Who is responsible for your data

**{{entity}}** ("we", "us") operates PDF Genius at [{{domain}}]({{website}}) and the PDF Genius Android app, and is the data controller for the personal data described here.{{addressSentence}} Privacy questions and requests: [{{privacyEmail}}](mailto:{{privacyEmail}}).

For payments, **Dodo Payments** (PDF Tools) and **Paddle** (Education Zone) act as independent Merchants of Record and controllers of the payment data they collect; Google Play does the same for in-app purchases. Their privacy notices apply to that data.

## 2. Data we collect

| Category | What | Source |
| --- | --- | --- |
| Account data | Email address, name, password (stored only as a one-way hash), sign-up date, plan, optional profile photo | You |
| Google Sign-In | Email address, name and Google account identifier, verified by Google | Google, when you choose it |
| Terms acceptance | Date and version of the Terms and Privacy Policy you accepted | Sign-up |
| Files you upload | Documents, images, video and text you submit to a tool, and the resulting output files | You |
| Education content | Text extracted from documents you provide, your questions and settings, and generated quizzes, papers, notes and answers | You and the Service |
| Usage records | Tool used, file name, file size, processing status and timestamps for each conversion; Education usage counts | The Service |
| Billing records | Plan, credit balances, credit purchases and expiry, and the customer, subscription and transaction identifiers returned by the Merchant of Record. **We never receive your full card number.** | Dodo Payments, Paddle, Google Play |
| Support messages | Your name, email, topic and message when you contact us | You |
| Technical data | IP address, browser or device type and request logs, used for security, rate limiting and troubleshooting | Your device |
| Advertising measurement | If you accept advertising cookies on the website: Google Ads conversion events (for example that a download completed) and Google's cookie identifiers | Your browser, via Google |
| Android app | Camera images when you use the scanner; files you pick; purchase status from Google Play via RevenueCat | Your device |

We do not knowingly collect special-category data. Please avoid uploading documents containing sensitive data you do not need to process.

## 3. How we use data and our legal bases

| Purpose | Legal basis (GDPR / UK GDPR) |
| --- | --- |
| Create and secure your account, verify your email, sign you in | Contract; legitimate interests (security) |
| Process your files and generate Education outputs | Contract |
| Show your conversion history and let you re-download results | Contract |
| Sell and manage subscriptions and credits, apply plan limits | Contract; legal obligation (tax and accounting, via the MoR) |
| Send verification codes, password resets and service notices | Contract; legitimate interests |
| Answer support and legal requests | Legitimate interests; legal obligation |
| Prevent abuse, fraud and overload (rate limits, logs) | Legitimate interests |
| Measure Google Ads campaigns on the website | Consent (you can withdraw it at any time) |
| Comply with law and enforce our Terms | Legal obligation; legitimate interests |

We do not sell your personal data, and we do not use your files or Education content for advertising.

## 4. Files: processing, retention and deletion

- **Browser-based tools** process the file on your device; the file is not uploaded.
- **Server-based tools** upload the file over HTTPS to our servers for processing. Input files are held in server memory while the job runs and are then discarded.
- **Converted results** are stored in object storage so you can download them, and are **automatically deleted 24 hours** after creation by a scheduled cleanup job. You can delete a result sooner from your history.
- **Image-editor uploads** that are kept for editing are held in server memory for up to 60 minutes, then removed.
- **Conversion records** (file name, tool, size, status, timestamps, but not the file itself) are kept while your account exists so we can show history and usage. Records from visitors without an account are not linked to a person.
- **Education Zone source documents** are processed transiently to generate your result and are not kept as files. Education generation history is kept for 24 hours.
- **Profile photos** are stored until you remove them or delete your account.

## 5. AI processing

Education Zone tools send the text extracted from your document, along with your request, to **OpenRouter**, which routes it to **OpenAI** models to generate outputs and to create text embeddings for source-cited answers. AI image tools (such as background removal and upscaling) send the image to **Replicate**, which runs the selected model. OCR (text recognition) runs on our own servers.

These providers process the data on our behalf to return a result. Their own retention and model-training terms apply to data they receive; we select settings and providers intended to limit retention, but we do not make promises on their behalf beyond their published terms.
<!-- TODO: confirm — whether OpenRouter/OpenAI and Replicate contractually exclude API inputs from model training and their retention periods; only then add a "not used to train models" statement. -->

## 6. Payment data

Payments are collected and processed by the Merchant of Record — Dodo Payments for PDF Tools, Paddle for the Education Zone, and Google Play for Android in-app purchases. They collect card or wallet details, billing address and tax information under their own privacy notices. We receive only what we need to run your account: your plan, the amount and credits purchased, and reference identifiers. In the Android app, RevenueCat receives purchase receipts from Google Play to confirm what you bought.

## 7. Cookies and similar storage

The website does not set its own cookies. It uses your browser's local storage for your sign-in token, your cookie choices and on-device search history. **Google Ads cookies are only set if you accept advertising cookies** in the consent banner. Details and controls are in the [Cookie Policy](/cookie-policy).

## 8. Sub-processors and recipients

| Provider | Purpose | Data |
| --- | --- | --- |
| Railway | Application hosting | All data processed by the servers |
| Supabase | Database | Account, usage and billing records |
| Backblaze B2 (S3-compatible storage) | Storing converted results and profile photos | Output files, profile photos |
| Resend | Sending emails | Email address, verification codes, support messages |
| Google | Google Sign-In; Google Ads measurement (only with consent) | Sign-in identity; ad cookie identifiers and conversion events |
| OpenRouter and OpenAI | Education Zone AI generation and embeddings | Document text and prompts |
| Replicate | AI image processing | Images submitted to those tools |
| Dodo Payments | Merchant of Record for PDF Tools | Payment and billing data |
| Paddle | Merchant of Record for the Education Zone | Payment and billing data |
| RevenueCat and Google Play | Android in-app purchases | Purchase receipts, app user identifier |
| Expo (EAS) | Building and delivering Android app updates | App update requests |
<!-- TODO: confirm — Backblaze is the active S3 provider in production and hosting/storage regions; whether Expo EAS Update is used in production. -->

We may also disclose data if required by law, to protect rights and safety, or as part of a business transfer, in which case this policy continues to apply.

## 9. International transfers

We are based in the United Kingdom, and our providers may process data in the United States and other countries outside the UK and EEA. Where data is transferred to a country without UK or EU adequacy, we rely on safeguards such as the UK International Data Transfer Agreement or Addendum and the European Commission's Standard Contractual Clauses, as offered in our providers' data processing terms.

## 10. Security

Data is encrypted in transit with HTTPS. Passwords are stored as one-way hashes, API keys are stored hashed, and access to production systems is restricted. Converted files are deleted automatically after 24 hours to reduce what we hold. No system is perfectly secure; if a breach affects your personal data we will notify you and regulators as the law requires.

## 11. How long we keep data

| Data | Retention |
| --- | --- |
| Converted output files | 24 hours, then automatically deleted |
| Education history | 24 hours |
| Account, usage and billing records | While your account exists; deleted immediately when you delete your account |
| Support emails | As long as needed to resolve the request and keep a record of it |
| Server logs | For a limited period set by our hosting provider |
| Records the Merchant of Record must keep | Kept by Dodo Payments, Paddle or Google under their own legal obligations |
<!-- TODO: confirm — support email retention period, server log retention, and database backup retention after account deletion. -->

## 12. Your rights

Depending on where you live, you may have the right to:

- access a copy of your personal data;
- correct inaccurate data (you can edit your name and photo in your profile);
- delete your data — you can [delete your account](/delete-account) yourself at any time;
- export your data in a portable format;
- object to or restrict certain processing;
- withdraw consent (for advertising cookies, use "Cookie settings" in the footer);
- complain to your local data protection authority (in the UK, the ICO; in the EU, your national authority).

### US state privacy rights (including California CCPA/CPRA)

California and other US state residents may request to know, access, correct and delete personal information, and may not be discriminated against for doing so. **We do not sell personal information**, and we do not "share" it for cross-context behavioural advertising **unless you accept advertising cookies**. You can opt out at any time by choosing "Reject" in Cookie settings; we also treat a Global Privacy Control (GPC) signal as an opt-out. In the past 12 months we have collected the categories listed in section 2 for the purposes in section 3.

### How to make a request

Email [{{privacyEmail}}](mailto:{{privacyEmail}}) from the address on your account, or use the [contact form](/contact). We may need to verify your identity. We respond within one month (GDPR / UK GDPR) or 45 days (US state laws), and may extend where the law allows. An authorised agent may make a request on your behalf with proof of authority.

## 13. Children

The Service is not directed at children under 13, and we do not knowingly collect personal data from them. Users under 18 should use the Service with a parent's or guardian's involvement. If you believe a child under 13 has given us personal data, contact [{{privacyEmail}}](mailto:{{privacyEmail}}) and we will delete it.

## 14. Android app permissions

| Permission | Why we ask | When |
| --- | --- | --- |
| Camera | To scan paper documents into PDFs or images | Only when you open the scanner |
| Photos and media / storage | To pick files and images to convert, and to save results where you choose | Only when you pick or save a file |
| Internet | To send files to server-based tools and sign you in | While you use the app |

You can revoke permissions in Android settings at any time; features that need them will stop working. The app does not include third-party advertising or analytics SDKs. See also [Data Safety](/data-safety).

## 15. Changes to this policy

We will update this policy when our practices change. The "Last updated" date shows the current version, and we will notify you of material changes by email or in the app before they take effect.

## 16. Contact

**{{legalName}}** (company number {{companyNumber}}, {{address}}) — Privacy: [{{privacyEmail}}](mailto:{{privacyEmail}}) · Support: [{{supportEmail}}](mailto:{{supportEmail}})
