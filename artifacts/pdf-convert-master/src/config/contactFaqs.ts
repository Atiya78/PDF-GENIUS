import { FILE_RETENTION_COPY, FILE_RETENTION_TODO, SUPPORT_REPLY_COPY, SUPPORT_REPLY_TODO } from "./siteCopy";

export const contactFaqs = [
  {
    question: "What file formats do you support for conversion?",
    answer: "We support a wide range of file formats including PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), JPG, PNG, HTML, and many more. Our tools can handle most common document and image formats.",
  },
  {
    question: "Is there a file size limit for uploads?",
    answer: "Check the limit displayed by the tool you are using. Supported input formats and file-size limits vary between tools.",
  },
  {
    question: "How is my file handled during conversion?",
    answer: `Some tools process locally and others upload files. Transfers use HTTPS. ${FILE_RETENTION_COPY} ${FILE_RETENTION_TODO}`,
  },
  {
    question: "How can I contact support?",
    answer: `Email support@pdfgenius.app and describe the tool and issue. ${SUPPORT_REPLY_COPY}. ${SUPPORT_REPLY_TODO}`,
  },
];