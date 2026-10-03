// PURE data module: no aliases, no React, no toolConfig imports.
// Imported by the app (router + ToolLanding) and by the prerender build script.

export interface ToolPageFaq {
  question: string;
  answer: string;
}

export interface ToolPage {
  slug: string;
  toolId: string;
  title: string;
  description: string;
  howTo: string[];
  why: string;
  faqs: ToolPageFaq[];
  related: string[];
}

type Mode = "local" | "share" | "server" | "soon";

interface Spec {
  slug: string;
  toolId: string;
  name: string;
  mode: Mode;
  title: string;
  description: string;
  howTo: [string, string, string];
  why: string;
  q1: [string, string];
  q2: [string, string];
  formats: string;
  related: [string, string, string, string];
}

const processingFaq = (name: string, mode: Mode): ToolPageFaq => {
  switch (mode) {
    case "local":
      return {
        question: `Is my file uploaded when I use ${name}?`,
        answer: `No. ${name} runs in your browser, so the file is read and changed on your own device and is not sent to our servers for this tool. Closing the tab discards the work you have not downloaded.`,
      };
    case "share":
      return {
        question: `Does ${name} send my image to a server?`,
        answer: `The editing itself happens in your browser. Nothing is uploaded unless you press the optional Share button, which uploads the edited result so you can get a link to it.`,
      };
    case "soon":
      return {
        question: `Can I use ${name} today?`,
        answer: `Not yet. ${name} is marked coming soon and there is no working conversion behind this page right now. Other tools on the site are unaffected.`,
      };
    default:
      return {
        question: `Where is my file processed when I use ${name}?`,
        answer: `${name} runs on our servers, so your file is uploaded over HTTPS, processed, and the result is made available for you to download. Use a different tool, such as Edit PDF, if you need processing to stay in your browser.`,
      };
  }
};

const formatFaq = (name: string, formats: string): ToolPageFaq => ({
  question: `Which files does ${name} accept?`,
  answer: `${formats} The maximum file size for this tool is shown on the tool itself before you add a file.`,
});

const make = (s: Spec): ToolPage => ({
  slug: s.slug,
  toolId: s.toolId,
  title: s.title,
  description: s.description,
  howTo: [...s.howTo],
  why: s.why,
  faqs: [
    { question: s.q1[0], answer: s.q1[1] },
    { question: s.q2[0], answer: s.q2[1] },
    processingFaq(s.name, s.mode),
    formatFaq(s.name, s.formats),
  ],
  related: [...s.related],
});

export const toolPages: ToolPage[] = [
  make({
    slug: "pdf-to-word", toolId: "pdf-to-word", name: "PDF to Word", mode: "server",
    title: "PDF to Word Converter Online | PDF Genius",
    description: "Turn a PDF into an editable Word document in your browser. Free web tool, no signup. Upload, convert and download the DOCX.",
    howTo: ["Add the PDF you want to edit in Word.", "Start the conversion and wait for it to finish.", "Download the Word file and open it in your editor."],
    why: "Use it when you have a PDF you need to rewrite, reuse or correct. Complex layouts, scanned pages and unusual fonts may need a manual check after conversion.",
    q1: ["Can I edit the converted file in Word?", "Yes, the output is a Word document you can open and edit. Always review the result, as tables, columns and fonts can shift when a PDF is converted."],
    q2: ["Will a scanned PDF turn into editable text?", "A scan is a picture of a page, so plain conversion may not give you editable text. Run OCR PDF first if you need selectable text."],
    formats: "PDF files only.", related: ["word-to-pdf", "ocr-pdf", "edit-pdf", "pdf-to-excel"],
  }),
  make({
    slug: "word-to-pdf", toolId: "word-to-pdf", name: "Word to PDF", mode: "server",
    title: "Word to PDF Converter Online | PDF Genius",
    description: "Convert DOC and DOCX files to PDF online. Free web tool, no signup. Upload your document and download a PDF to share or print.",
    howTo: ["Add your DOC or DOCX file.", "Start the conversion.", "Download the PDF when it is ready."],
    why: "A PDF opens the same way on most devices, which makes it a safer format for sending contracts, CVs and reports. Check page breaks and fonts in the result.",
    q1: ["Why convert a Word file to PDF?", "A PDF is meant to be read, not edited, so recipients see fixed pages instead of a layout that can change between programs."],
    q2: ["Can I convert several documents at once?", "Add a file for each run. To combine finished PDFs into one document afterwards, use Merge PDF."],
    formats: "DOC and DOCX files.", related: ["pdf-to-word", "merge-pdf", "compress-pdf", "sign-pdf"],
  }),
  make({
    slug: "pdf-to-excel", toolId: "pdf-to-excel", name: "PDF to Excel", mode: "server",
    title: "PDF to Excel Converter Online | PDF Genius",
    description: "Extract tables from a PDF into an Excel spreadsheet. Free web tool, no signup. Upload the PDF and download an XLSX file.",
    howTo: ["Add the PDF that contains your tables.", "Start the conversion.", "Download the spreadsheet and check the cells."],
    why: "Handy for pulling figures out of statements and reports so you do not retype them. Tables with merged cells or unusual layouts usually need tidying afterwards.",
    q1: ["Does every table convert cleanly?", "Simple, well-aligned tables convert best. Merged cells, images of tables and multi-line cells can land in the wrong place, so review the sheet."],
    q2: ["What if my PDF is a scan?", "A scanned page has no real table data to extract. Run OCR PDF first, then try the conversion again."],
    formats: "PDF files only.", related: ["pdf-to-word", "excel-to-pdf", "ocr-pdf", "pdf-to-powerpoint"],
  }),
  make({
    slug: "excel-to-pdf", toolId: "excel-to-pdf", name: "Excel to PDF", mode: "server",
    title: "Excel to PDF Converter Online | PDF Genius",
    description: "Convert XLS and XLSX spreadsheets to PDF online. Free web tool, no signup. Upload the workbook and download a PDF.",
    howTo: ["Add your XLS or XLSX workbook.", "Start the conversion.", "Download the PDF and check the page layout."],
    why: "Turn a spreadsheet into a fixed document for sharing or printing. Wide sheets may split across pages, so set print areas in Excel first if the layout matters.",
    q1: ["Why does my sheet split over several pages?", "The PDF follows the page setup in the workbook. Adjust page size, orientation and scaling in Excel, then convert again."],
    q2: ["Are formulas kept in the PDF?", "No. The PDF shows the calculated values as pages, not the formulas behind them."],
    formats: "XLS and XLSX files.", related: ["pdf-to-excel", "word-to-pdf", "merge-pdf", "compress-pdf"],
  }),
  make({
    slug: "powerpoint-to-pdf", toolId: "powerpoint-to-pdf", name: "PowerPoint to PDF", mode: "server",
    title: "PowerPoint to PDF Converter Online | PDF Genius",
    description: "Convert PPT and PPTX slideshows to PDF online. Free web tool, no signup. Upload your deck and download a PDF.",
    howTo: ["Add your PPT or PPTX presentation.", "Start the conversion.", "Download the PDF and flip through the slides."],
    why: "A PDF deck is easier to email and open on any device. Animations and embedded media do not carry over, since each slide becomes a static page.",
    q1: ["Do animations and videos survive?", "No. Each slide becomes a static page, so transitions, animations and embedded video are not included."],
    q2: ["Can I send the PDF instead of the deck?", "Yes, many people do. Recipients can read it without PowerPoint, but they cannot edit the slides."],
    formats: "PPT and PPTX files.", related: ["pdf-to-powerpoint", "compress-pdf", "merge-pdf", "word-to-pdf"],
  }),
  make({
    slug: "pdf-to-powerpoint", toolId: "pdf-to-powerpoint", name: "PDF to PowerPoint", mode: "server",
    title: "PDF to PowerPoint Converter Online | PDF Genius",
    description: "Turn a PDF into an editable PowerPoint presentation. Free web tool, no signup. Upload the PDF and download PPT or PPTX.",
    howTo: ["Add the PDF you want as slides.", "Start the conversion.", "Download the presentation and tidy the slides."],
    why: "Useful when you only have the PDF of a deck and want to reuse its content. Expect to adjust text boxes and images after conversion.",
    q1: ["Will the slides look identical?", "Often close, not guaranteed. Fonts, spacing and layered graphics can change, so review each slide."],
    q2: ["Can I convert a report into slides?", "You can, but each PDF page becomes a slide, so long pages may need to be reworked by hand."],
    formats: "PDF files only.", related: ["powerpoint-to-pdf", "pdf-to-word", "edit-pdf", "pdf-to-jpg"],
  }),
  make({
    slug: "pdf-to-jpg", toolId: "pdf-to-images", name: "PDF to JPG", mode: "server",
    title: "PDF to JPG Converter Online | PDF Genius",
    description: "Convert each PDF page to an image. Choose JPG or JPEG in the output settings. Free web tool; results come as a ZIP.",
    howTo: ["Add the PDF and open the output settings if shown.", "Choose JPG (JPEG) as the image format, then start the conversion.", "Download the ZIP archive that holds one image per page."],
    why: "Page images are useful for slides, previews and websites that do not take PDFs. The result is a ZIP of page images, not a single JPG.",
    q1: ["Is the output one JPG file?", "No. Each page becomes its own image and the images are delivered together in a ZIP archive."],
    q2: ["How do I get JPG and not another format?", "Select JPG or JPEG in the available output settings before you start. If you pick another image format you will get that format instead."],
    formats: "PDF files only.", related: ["jpg-to-pdf", "convert-image", "pdf-to-word", "compress-pdf"],
  }),
  make({
    slug: "jpg-to-pdf", toolId: "images-to-pdf", name: "JPG to PDF", mode: "server",
    title: "JPG to PDF Converter Online | PDF Genius",
    description: "Combine JPG, PNG and other images into one PDF online. Free web tool, no signup. Add images, order them and download.",
    howTo: ["Add one or more images.", "Put them in the order you want pages to appear.", "Create the PDF and download it."],
    why: "Make one document out of photos, scans or screenshots so it is easier to send. Images are placed one per page in the order you set.",
    q1: ["Can I put several photos in one PDF?", "Yes. Add all the images, arrange them, and each becomes a page of a single PDF."],
    q2: ["Can I rearrange pages after creating the PDF?", "Set the order before you create it. To remove pages afterwards, use Delete PDF Pages, or Merge PDF to combine with other files."],
    formats: "JPG, JPEG, PNG, GIF, BMP and WebP images.", related: ["pdf-to-jpg", "merge-pdf", "compress-pdf", "add-image-to-pdf"],
  }),
  make({
    slug: "html-to-pdf", toolId: "html-to-pdf", name: "HTML to PDF", mode: "server",
    title: "HTML to PDF Converter Online | PDF Genius",
    description: "Convert HTML files to PDF online. Free web tool, no signup. Upload your HTML file and download the PDF.",
    howTo: ["Add your HTML file.", "Start the conversion.", "Download the PDF and check the layout."],
    why: "Save a page you built or exported as a fixed document. External styles and images that are not included in the file may not appear.",
    q1: ["Can I paste a web address instead?", "This tool takes an HTML file you add, not a live web address."],
    q2: ["Why are images or styles missing?", "Files that link to external stylesheets or images may not load them during conversion. Inline the styles or embed the images where you can."],
    formats: "HTML and HTM files.", related: ["word-to-pdf", "jpg-to-pdf", "compress-pdf", "edit-pdf"],
  }),
  make({
    slug: "merge-pdf", toolId: "merge-pdfs", name: "Merge PDF", mode: "server",
    title: "Merge PDF Files Online | PDF Genius",
    description: "Combine several PDF files into one document online. Free web tool, no signup. Add files, set the order and merge.",
    howTo: ["Add the PDF files you want to combine.", "Use the arrows to set the order, with the top file first.", "Merge them and download the single PDF."],
    why: "One document is easier to send, print and archive than a pile of separate files. The order you set is the order of the pages.",
    q1: ["How do I control the order of pages?", "Files are merged top to bottom. Use the arrows to move a file up or down before you merge."],
    q2: ["Can I merge only some pages of a file?", "Merge combines whole files. Use Split PDF or Delete PDF Pages first to cut a file down to the pages you need."],
    formats: "PDF files only.", related: ["split-pdf", "compress-pdf", "delete-pdf-pages", "rotate-pdf"],
  }),
  make({
    slug: "split-pdf", toolId: "split-pdf", name: "Split PDF", mode: "server",
    title: "Split PDF Pages Online | PDF Genius",
    description: "Split a PDF into separate pages or sections online. Free web tool, no signup. Upload, choose how to split and download.",
    howTo: ["Add the PDF you want to divide.", "Choose how to split it, by pages or by sections.", "Start the split and download the results."],
    why: "Pull out a chapter, an invoice or a single page without sending the whole file. Results are separate PDFs you can merge again later.",
    q1: ["Can I extract just one page?", "Yes. Choose the page or range you want when setting up the split."],
    q2: ["Does splitting change the original?", "No. You get new files and the PDF you added stays as it was on your device."],
    formats: "PDF files only.", related: ["merge-pdf", "delete-pdf-pages", "rotate-pdf", "compress-pdf"],
  }),
  make({
    slug: "compress-pdf", toolId: "compress-pdf", name: "Compress PDF", mode: "server",
    title: "Compress PDF Online Free | PDF Genius",
    description: "Reduce the file size of a PDF so it is easier to email or upload. Free web tool, no signup. Upload and download the smaller file.",
    howTo: ["Add the PDF you want to shrink.", "Start the compression.", "Download the result and compare the sizes."],
    why: "Smaller files fit email limits and upload forms. How much a file shrinks depends on what is inside it, and image-heavy PDFs vary most.",
    q1: ["How much smaller will my PDF get?", "It varies. PDFs full of large images often shrink more, while text-only files may change little."],
    q2: ["Will the quality change?", "Reducing size can reduce image detail. Check the result before you replace the original."],
    formats: "PDF files only.", related: ["merge-pdf", "split-pdf", "compress-image", "pdf-to-jpg"],
  }),
  make({
    slug: "edit-pdf", toolId: "edit-pdf", name: "Edit PDF", mode: "local",
    title: "Edit PDF Online in Your Browser | PDF Genius",
    description: "Add text and images to a PDF right in your browser. Free web tool, no signup, and your file is not uploaded.",
    howTo: ["Open the PDF in the editor.", "Add text or images and move them into place.", "Save the edited PDF to your device."],
    why: "Fill in a form, add a note or place a logo without installing software. It adds to pages; it does not rewrite the existing text of the PDF.",
    q1: ["Can I change existing text in the PDF?", "The editor adds new text and images on top of the pages. It is not a full text-reflow editor."],
    q2: ["Can I fill in a form?", "You can type text onto the page wherever you need it, which works for most flat forms."],
    formats: "PDF files only.", related: ["sign-pdf", "watermark-pdf", "add-image-to-pdf", "rotate-pdf"],
  }),
  make({
    slug: "rotate-pdf", toolId: "rotate-pdf", name: "Rotate PDF", mode: "local",
    title: "Rotate PDF Pages Online | PDF Genius",
    description: "Turn sideways or upside-down PDF pages the right way up in your browser. Free web tool, and your file is not uploaded.",
    howTo: ["Open your PDF.", "Rotate the pages that are the wrong way round.", "Save the corrected PDF."],
    why: "Fix scans that came out sideways so the document reads properly everywhere. The change is saved into the new file you download.",
    q1: ["Can I rotate only some pages?", "Yes. Rotate just the pages that need it and leave the rest as they are."],
    q2: ["Is the rotation permanent?", "It is saved in the PDF you download. Your original file is not modified."],
    formats: "PDF files only.", related: ["crop-pdf", "delete-pdf-pages", "merge-pdf", "split-pdf"],
  }),
  make({
    slug: "crop-pdf", toolId: "crop-pdf", name: "Crop PDF", mode: "local",
    title: "Crop PDF Pages Online | PDF Genius",
    description: "Trim margins or select a region and crop every page of a PDF in your browser. Free web tool, no upload.",
    howTo: ["Open your PDF.", "Drag to select the area to keep.", "Apply the crop and save the PDF."],
    why: "Cut away wide margins or scanner edges so content fills the page. The crop is applied to every page of the document.",
    q1: ["Does the crop apply to all pages?", "Yes, the selected region is applied to every page. Use Split PDF first if only some pages need cropping."],
    q2: ["Can I undo a crop?", "Your original file is untouched. If the result is wrong, reopen the original and crop again."],
    formats: "PDF files only.", related: ["rotate-pdf", "edit-pdf", "delete-pdf-pages", "compress-pdf"],
  }),
  make({
    slug: "sign-pdf", toolId: "sign-pdf", name: "Sign PDF", mode: "local",
    title: "Sign PDF Online | PDF Genius",
    description: "Draw, type or upload a signature and place it on your PDF in your browser. Free web tool, and your file is not uploaded.",
    howTo: ["Open the PDF you need to sign.", "Draw, type or upload your signature.", "Place it where it belongs and save the PDF."],
    why: "Sign a form or agreement without printing. This places an image of your signature on the page; it is not a certificate-based digital signature.",
    q1: ["Is this a legally binding digital signature?", "It places a visual signature on the page. Whether that is acceptable depends on who asks for it, so check their requirements."],
    q2: ["Can I reuse a signature image?", "Yes. You can upload an image of your signature and position and resize it on the page."],
    formats: "PDF files only.", related: ["edit-pdf", "watermark-pdf", "lock-pdf", "add-image-to-pdf"],
  }),
  make({
    slug: "watermark-pdf", toolId: "watermark-pdf", name: "Watermark PDF", mode: "local",
    title: "Add a Watermark to PDF Online | PDF Genius",
    description: "Stamp a text or image watermark across every page of a PDF in your browser. Free web tool, and no upload.",
    howTo: ["Open your PDF.", "Enter watermark text or choose an image.", "Apply it to all pages and save the PDF."],
    why: "Mark drafts as confidential or brand a document before sharing it. The watermark is applied to every page.",
    q1: ["Can I use my logo?", "Yes. Choose an image instead of text and it is stamped across the pages."],
    q2: ["Can the watermark be removed later?", "Treat it as permanent in the saved file. Keep your original if you need a clean copy."],
    formats: "PDF files for the document; PNG or JPG images for an image watermark.", related: ["edit-pdf", "sign-pdf", "add-image-to-pdf", "lock-pdf"],
  }),
  make({
    slug: "add-image-to-pdf", toolId: "add-image-pdf", name: "Add Image to PDF", mode: "local",
    title: "Add an Image to a PDF Online | PDF Genius",
    description: "Place a logo, photo or stamp on any page of a PDF and resize it, in your browser. Free web tool, and no upload.",
    howTo: ["Open your PDF.", "Choose the image and drop it on the right page.", "Resize and position it, then save the PDF."],
    why: "Add a logo, a photo or a stamp to a single page without redoing the whole document. You choose the page and the size.",
    q1: ["Can I put the image on just one page?", "Yes. Pick the page, then position and resize the image on it."],
    q2: ["Which image types can I add?", "Common image files such as PNG and JPG work. A transparent PNG keeps its transparent background."],
    formats: "A PDF file plus an image to place on it.", related: ["edit-pdf", "watermark-pdf", "sign-pdf", "jpg-to-pdf"],
  }),
  make({
    slug: "delete-pdf-pages", toolId: "delete-pages-pdf", name: "Delete PDF Pages", mode: "local",
    title: "Delete Pages from a PDF Online | PDF Genius",
    description: "Preview page thumbnails and remove the pages you don't need, in your browser. Free web tool, and no upload.",
    howTo: ["Open your PDF and wait for the thumbnails.", "Select the pages you want to remove.", "Save the new PDF without them."],
    why: "Drop blank pages, cover sheets or anything you should not send. The thumbnails let you check each page before it goes.",
    q1: ["Can I undo a deletion?", "Until you save, you can change your selection. Your original file is never modified."],
    q2: ["How do I keep only certain pages instead?", "Select every page you do not want and delete those, or use Split PDF to extract the pages you want."],
    formats: "PDF files only.", related: ["split-pdf", "merge-pdf", "rotate-pdf", "crop-pdf"],
  }),
  make({
    slug: "ocr-pdf", toolId: "ocr-pdf", name: "OCR PDF", mode: "server",
    title: "OCR PDF: Make Scans Searchable | PDF Genius",
    description: "Recognise text in scanned PDFs and export selectable text or a searchable PDF. Free web tool, no signup.",
    howTo: ["Add your scanned PDF.", "Choose selectable text or a searchable PDF as the output.", "Start recognition and download the result."],
    why: "A scan is just a picture of text. OCR reads it so you can search, copy and reuse the words. Accuracy depends on scan clarity.",
    q1: ["How accurate is the text?", "It depends on the scan. Clear, straight, high-contrast pages recognise better than faint or skewed ones, so proofread important text."],
    q2: ["What is the difference between the outputs?", "A searchable PDF keeps the page image and adds a text layer. Selectable text output gives you the recognised words."],
    formats: "PDF files only.", related: ["pdf-to-word", "pdf-to-excel", "compress-pdf", "edit-pdf"],
  }),
  make({
    slug: "compress-image", toolId: "compress-images", name: "Compress Image", mode: "server",
    title: "Compress Images Online | PDF Genius",
    description: "Reduce image file size for the web or email. Free web tool, no signup. Upload an image and download the smaller version.",
    howTo: ["Add the image you want to shrink.", "Start the compression.", "Download it and compare the file sizes."],
    why: "Smaller images load faster and fit upload limits. Some detail can be lost when size is reduced, so check the result.",
    q1: ["Will the image look different?", "It can. Reducing size usually removes some detail, so view the result before replacing the original."],
    q2: ["Which format should I start with?", "Any supported image works. If you need a different format afterwards, use Convert Image."],
    formats: "Common image files such as JPG, PNG and WebP.", related: ["convert-image", "resize-image", "compress-pdf", "crop-image"],
  }),
  make({
    slug: "convert-image", toolId: "convert-image-format", name: "Convert Image", mode: "server",
    title: "Convert Image Format Online | PDF Genius",
    description: "Convert images to JPG, PNG, WebP, GIF, AVIF or TIFF with quality settings. Free web tool, no signup.",
    howTo: ["Add your image.", "Choose the output format and quality.", "Convert and download the new file."],
    why: "Switch formats to suit a website, an app or a printer. Moving to a lossy format can reduce quality, and some formats do not support transparency.",
    q1: ["Does converting to JPG remove transparency?", "JPG has no transparency, so transparent areas get a solid background. PNG and WebP keep transparency."],
    q2: ["Which output formats are available?", "JPG, PNG, WebP, GIF, AVIF and TIFF, with quality settings for formats that use them."],
    formats: "Common image files such as JPG, PNG, WebP, GIF, AVIF and TIFF.", related: ["compress-image", "resize-image", "pdf-to-jpg", "jpg-to-pdf"],
  }),
  make({
    slug: "crop-image", toolId: "crop-images", name: "Crop Image", mode: "share",
    title: "Crop Images Online | PDF Genius",
    description: "Cut specific parts of an image with freeform or preset ratios in your browser. Free web tool, no signup.",
    howTo: ["Open your image.", "Drag the frame or pick a preset ratio.", "Apply the crop and download the image."],
    why: "Trim an image to the part that matters or to a ratio a site asks for. Cropping happens in your browser.",
    q1: ["Can I crop to a fixed ratio?", "Yes. Pick a preset ratio or draw a freeform selection."],
    q2: ["What does the Share button do?", "Share is optional. It uploads the edited result so you can get a link; if you do not press it, nothing is uploaded."],
    formats: "Common image files such as JPG, PNG and WebP.", related: ["resize-image", "rotate-image", "compress-image", "convert-image"],
  }),
  make({
    slug: "resize-image", toolId: "resize-images", name: "Resize Image", mode: "share",
    title: "Resize Images Online | PDF Genius",
    description: "Change image dimensions, scale by percentage or use preset sizes in your browser. Free web tool, no signup.",
    howTo: ["Open your image.", "Enter new dimensions, a percentage or a preset size.", "Apply the change and download the image."],
    why: "Get an image to the exact size a form, profile or page asks for. Resizing runs in your browser.",
    q1: ["Can I scale by percentage?", "Yes. Enter a percentage, exact dimensions, or choose a preset size."],
    q2: ["Does enlarging an image add detail?", "No. Scaling up stretches the existing pixels, so large enlargements look soft. Upscale Image is built for that job."],
    formats: "Common image files such as JPG, PNG and WebP.", related: ["crop-image", "compress-image", "upscale-image", "convert-image"],
  }),
  make({
    slug: "rotate-image", toolId: "rotate-images", name: "Rotate Image", mode: "share",
    title: "Rotate Images Online | PDF Genius",
    description: "Rotate an image by any angle with automatic background fill, in your browser. Free web tool, no signup.",
    howTo: ["Open your image.", "Set the angle you need.", "Apply the rotation and download the result."],
    why: "Straighten a tilted photo or fix a sideways one. Angles that are not multiples of 90 leave corners that are filled automatically.",
    q1: ["Can I rotate by a custom angle?", "Yes. Any angle works, and the empty corners are filled with a background."],
    q2: ["What does Share do?", "It is optional and uploads the edited result to give you a link. Without it, the image stays in your browser."],
    formats: "Common image files such as JPG, PNG and WebP.", related: ["crop-image", "resize-image", "compress-image", "rotate-pdf"],
  }),
  make({
    slug: "upscale-image", toolId: "upscale-images", name: "Upscale Image", mode: "server",
    title: "Upscale Images with AI Online | PDF Genius",
    description: "Enlarge an image up to 4x using AI-based upscaling. Free web tool, no signup. Upload and download the larger image.",
    howTo: ["Add the image you want to enlarge.", "Choose the scale factor.", "Start upscaling and download the result."],
    why: "Make a small image bigger than simple stretching allows. Results vary with the picture, so look closely before using it.",
    q1: ["How large can the image get?", "The tool enlarges images up to 4x their original size."],
    q2: ["Will it recover lost detail?", "It estimates detail rather than restoring the original, so results vary. Very small or heavily compressed images may still look rough."],
    formats: "Common image files such as JPG, PNG and WebP.", related: ["resize-image", "remove-background", "compress-image", "convert-image"],
  }),
  make({
    slug: "remove-background", toolId: "remove-background", name: "Remove Background", mode: "server",
    title: "Remove Image Background Online | PDF Genius",
    description: "Remove the background from an image automatically using AI. Free web tool, no signup. Download a cut-out PNG.",
    howTo: ["Add your photo.", "Start background removal.", "Download the cut-out image."],
    why: "Isolate a person or object for a listing, a design or a profile picture. Hair, glass and busy backgrounds can leave rough edges.",
    q1: ["What do I get back?", "An image with the background removed, which works best saved as PNG to keep the transparent area."],
    q2: ["Why are some edges rough?", "Fine hair, shadows and objects similar in colour to the background are harder to separate. Try a photo with clearer contrast."],
    formats: "Common image files such as JPG, PNG and WebP.", related: ["upscale-image", "crop-image", "resize-image", "convert-image"],
  }),
  make({
    slug: "lock-pdf", toolId: "lock-pdf", name: "Lock PDF", mode: "server",
    title: "Password Protect a PDF Online | PDF Genius",
    description: "Add a password to a PDF so it needs the password to open. Free web tool, no signup. Upload and download the protected PDF.",
    howTo: ["Add the PDF you want to protect.", "Choose a password and keep it somewhere safe.", "Lock the file and download it."],
    why: "Keep a document from being opened by anyone who does not have the password. If the password is lost, we cannot recover it for you.",
    q1: ["What if I forget the password?", "Store it safely. The protected file cannot be opened without it and we cannot recover it."],
    q2: ["Is the file encrypted?", "The result requires a password to open. Choose a long, unique password for anything sensitive."],
    formats: "PDF files only.", related: ["unlock-pdf", "sign-pdf", "watermark-pdf", "compress-pdf"],
  }),
  make({
    slug: "unlock-pdf", toolId: "unlock-pdf", name: "Unlock PDF", mode: "server",
    title: "Unlock a Password-Protected PDF | PDF Genius",
    description: "Remove password protection from a PDF you are allowed to open. Free web tool, no signup. Upload and download the unlocked file.",
    howTo: ["Add the protected PDF.", "Enter the password if the tool asks for it.", "Unlock the file and download the copy."],
    why: "Save a copy that opens without a password when you are the owner or have permission. Only use it on files you are entitled to open.",
    q1: ["Can it open a PDF I have no password for?", "It is meant for PDFs you can legitimately open. Do not use it on documents you do not have permission to unlock."],
    q2: ["Does the original change?", "No. You receive an unlocked copy and the protected original stays as it is."],
    formats: "PDF files only.", related: ["lock-pdf", "edit-pdf", "merge-pdf", "compress-pdf"],
  }),
  make({
    slug: "compress-video", toolId: "compress-video", name: "Compress Video", mode: "server",
    title: "Compress Video Online | PDF Genius",
    description: "Reduce the file size of a video for sharing or uploading. Free web tool, no signup. Upload a video and download the smaller file.",
    howTo: ["Add the video you want to shrink.", "Start the compression.", "Download the result and check how it plays."],
    why: "Smaller videos are easier to send and upload. Compression can lower picture quality, so review the result before deleting the original.",
    q1: ["Will the video look worse?", "Reducing file size usually costs some picture quality. Play the result before you rely on it."],
    q2: ["How long does it take?", "It depends on the video's length and size, so large files take longer than short clips."],
    formats: "Common video files.", related: ["compress-pdf", "compress-image", "convert-image", "merge-pdf"],
  }),
  make({
    slug: "restore-document", toolId: "restore-document", name: "Document Restore", mode: "soon",
    title: "Document Restore (Coming Soon) | PDF Genius",
    description: "Document Restore is coming soon. It is not available yet; other PDF Genius web tools are free to use now.",
    howTo: ["Check back later, as this tool is not available yet.", "Meanwhile, try OCR PDF for scanned documents.", "Browse the other free tools on the Tools page."],
    why: "Document Restore is planned for repairing damaged or faded documents. It has no working service yet, so nothing can be submitted here today.",
    q1: ["When will it launch?", "There is no release date yet. This page will change once the tool is available."],
    q2: ["What can I use in the meantime?", "OCR PDF can make scanned pages searchable, and Compress PDF or Edit PDF handle other common jobs."],
    formats: "Not available yet, so no files are accepted.", related: ["ocr-pdf", "edit-pdf", "compress-pdf", "pdf-to-word"],
  }),
];

/** Old /upload/<id> route -> canonical clean path. */
export const legacyToolRedirects: Record<string, string> = {
  "/upload/pdf-to-word": "/pdf-to-word",
  "/upload/word-to-pdf": "/word-to-pdf",
  "/upload/pdf-to-excel": "/pdf-to-excel",
  "/upload/excel-to-pdf": "/excel-to-pdf",
  "/upload/powerpoint-to-pdf": "/powerpoint-to-pdf",
  "/upload/pdf-to-powerpoint": "/pdf-to-powerpoint",
  "/upload/pdf-to-images": "/pdf-to-jpg",
  "/upload/images-to-pdf": "/jpg-to-pdf",
  "/upload/html-to-pdf": "/html-to-pdf",
  "/upload/merge-pdfs": "/merge-pdf",
  "/upload/split-pdf": "/split-pdf",
  "/upload/compress-pdf": "/compress-pdf",
  "/upload/edit-pdf": "/edit-pdf",
  "/upload/rotate-pdf": "/rotate-pdf",
  "/upload/crop-pdf": "/crop-pdf",
  "/upload/sign-pdf": "/sign-pdf",
  "/upload/watermark-pdf": "/watermark-pdf",
  "/upload/add-image-pdf": "/add-image-to-pdf",
  "/upload/delete-pages-pdf": "/delete-pdf-pages",
  "/upload/ocr-pdf": "/ocr-pdf",
  "/upload/compress-image": "/compress-image",
  "/upload/convert-image-format": "/convert-image",
  "/upload/crop-image": "/crop-image",
  "/upload/resize-image": "/resize-image",
  "/upload/rotate-image": "/rotate-image",
  "/upload/remove-background": "/remove-background",
  "/upload/upscale-image": "/upscale-image",
  "/upload/lock-pdf": "/lock-pdf",
  "/upload/unlock-pdf": "/unlock-pdf",
  "/upload/compress-video": "/compress-video",
  "/upload/restore-document": "/restore-document",
};

export const toolPageBySlug = (slug: string): ToolPage | undefined =>
  toolPages.find((p) => p.slug === slug);

export const toolPageByToolId = (toolId: string): ToolPage | undefined =>
  toolPages.find((p) => p.toolId === toolId);

export const canonicalToolPath = (toolId: string): string | undefined => {
  const p = toolPageByToolId(toolId);
  return p ? `/${p.slug}` : undefined;
};
