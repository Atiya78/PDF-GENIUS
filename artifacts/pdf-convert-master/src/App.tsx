import { Component, lazy, Suspense, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DynamicLayout } from "@/components/DynamicLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/page-loader";

// Pages are lazy-loaded so each route ships as its own chunk. This keeps the
// initial bundle small and prevents heavy, tool-only libraries (pdf-lib,
// pdfjs-dist, tesseract.js, recharts) from being downloaded on first paint —
// they are only pulled in when the user actually opens the tool that uses them.
const NotFound = lazy(() => import("@/pages/not-found"));
const named = <K extends string, M extends Record<K, React.ComponentType<any>>>(
  loader: () => Promise<M>,
  key: K,
) => lazy(() => loader().then((m) => ({ default: m[key] })));

const Body = named(() => import("@/pages/Body"), "Body");
const Contact = named(() => import("@/pages/Contact"), "Contact");
const Pricing = named(() => import("@/pages/Pricing"), "Pricing");
const About = named(() => import("@/pages/About"), "About");
const Tools = named(() => import("@/pages/Tools"), "Tools");
const Dashboard = named(() => import("@/pages/Dashboard"), "Dashboard");
const UsageStatistics = named(() => import("@/pages/UsageStatistics"), "UsageStatistics");
const APISetup = named(() => import("@/pages/APISetup"), "APISetup");
const APIReference = named(() => import("@/pages/APIReference"), "APIReference");
const ManagePlans = named(() => import("@/pages/ManagePlans"), "ManagePlans");
const PaymentsBillingHelp = named(() => import("@/pages/PaymentsBillingHelp"), "PaymentsBillingHelp");
const BuyCredits = named(() => import("@/pages/BuyCredits"), "BuyCredits");
const LiveTools = named(() => import("@/pages/LiveTools"), "LiveTools");
const TermsOfService = named(() => import("@/pages/TermsOfService"), "TermsOfService");
const PrivacyPolicy = named(() => import("@/pages/PrivacyPolicy"), "PrivacyPolicy");
const RefundPolicy = named(() => import("@/pages/RefundPolicy"), "RefundPolicy");
const DataSafety = named(() => import("@/pages/DataSafety"), "DataSafety");
const Support = named(() => import("@/pages/Support"), "Support");
const SignUp = named(() => import("@/pages/SignUp"), "SignUp");
const SignIn = named(() => import("@/pages/SignIn"), "SignIn");
const ForgotPassword = named(() => import("@/pages/ForgotPassword"), "ForgotPassword");
const ResetPassword = named(() => import("@/pages/ResetPassword"), "ResetPassword");
const Profile = named(() => import("@/pages/Profile"), "Profile");
const WordToPdfUpload = named(() => import("@/pages/upload/WordToPdf"), "WordToPdfUpload");
const PdfToWordUpload = named(() => import("@/pages/upload/PdfToWord"), "PdfToWordUpload");
const PdfToExcelUpload = named(() => import("@/pages/upload/PdfToExcel"), "PdfToExcelUpload");
const ExcelToPdfUpload = named(() => import("@/pages/upload/ExcelToPdf"), "ExcelToPdfUpload");
const PowerPointToPdfUpload = named(() => import("@/pages/upload/PowerPointToPdf"), "PowerPointToPdfUpload");
const PdfToPowerPointUpload = named(() => import("@/pages/upload/PdfToPowerPoint"), "PdfToPowerPointUpload");
const PdfToImagesUpload = named(() => import("@/pages/upload/PdfToImages"), "PdfToImagesUpload");
const ImagesToPdfUpload = named(() => import("@/pages/upload/ImagesToPdf"), "ImagesToPdfUpload");
const HtmlToPdfUpload = named(() => import("@/pages/upload/HtmlToPdf"), "HtmlToPdfUpload");
const SplitPdfUpload = named(() => import("@/pages/upload/SplitPdf"), "SplitPdfUpload");
const CompressPdfUpload = named(() => import("@/pages/upload/CompressPdf"), "CompressPdfUpload");
const CompressVideoUpload = named(() => import("@/pages/upload/CompressVideo"), "CompressVideoUpload");
const RotatePdfUpload = named(() => import("@/pages/upload/RotatePdf"), "RotatePdfUpload");
const ResizeImageUpload = named(() => import("@/pages/upload/ResizeImage"), "ResizeImageUpload");
const CropImageUpload = named(() => import("@/pages/upload/CropImage"), "CropImageUpload");
const RotateImageUpload = named(() => import("@/pages/upload/RotateImage"), "RotateImageUpload");
const ConvertImageFormatUpload = named(() => import("@/pages/upload/ConvertImageFormat"), "ConvertImageFormatUpload");
const CompressImageUpload = named(() => import("@/pages/upload/CompressImage"), "CompressImageUpload");
const UpscaleImageUpload = named(() => import("@/pages/upload/UpscaleImage"), "UpscaleImageUpload");
const RemoveBackgroundUpload = named(() => import("@/pages/upload/RemoveBackground"), "RemoveBackgroundUpload");
const MergePdfsUpload = named(() => import("@/pages/upload/MergePdfs"), "MergePdfsUpload");
const EditPdfUpload = named(() => import("@/pages/upload/EditPdf"), "EditPdfUpload");
const CropPdfUpload = named(() => import("@/pages/upload/CropPdf"), "CropPdfUpload");
const SignPdfUpload = named(() => import("@/pages/upload/SignPdf"), "SignPdfUpload");
const WatermarkPdfUpload = named(() => import("@/pages/upload/WatermarkPdf"), "WatermarkPdfUpload");
const AddImagePdfUpload = named(() => import("@/pages/upload/AddImagePdf"), "AddImagePdfUpload");
const DeletePagesPdfUpload = named(() => import("@/pages/upload/DeletePagesPdf"), "DeletePagesPdfUpload");
const OcrPdfUpload = named(() => import("@/pages/upload/OcrPdf"), "OcrPdfUpload");
const RestoreDocumentUpload = named(() => import("@/pages/upload/RestoreDocument"), "RestoreDocumentUpload");
const LockPdfUpload = named(() => import("@/pages/upload/LockPdf"), "LockPdfUpload");
const UnlockPdfUpload = named(() => import("@/pages/upload/UnlockPdf"), "UnlockPdfUpload");
const ResizeImageTool = named(() => import("@/pages/ImageEditTools"), "ResizeImageTool");
const CropImageTool = named(() => import("@/pages/ImageEditTools"), "CropImageTool");
const RotateImageTool = named(() => import("@/pages/ImageEditTools"), "RotateImageTool");
const Features = named(() => import("@/pages/Features"), "Features");
const AdminPage = named(() => import("@/pages/AdminPage"), "AdminPage");
const LearnMore = named(() => import("@/pages/LearnMore"), "LearnMore");

// Route-loading fallback. Uses the single global PageLoader (the shared
// "processing" Lottie) so every loading state across the app looks identical —
// new tools/routes inherit it automatically with no extra code.
function PageFallback() {
  return <PageLoader />;
}

// Guards lazy routes against dynamic-import failures (e.g. a user on a stale tab
// after a new deploy, or a flaky network). On a chunk-load error we reload once
// to fetch the fresh asset manifest; otherwise we show a friendly retry instead
// of a blank white screen.
class LazyErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isChunkError =
      /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
        message,
      );
    if (isChunkError && !sessionStorage.getItem("chunk-reloaded")) {
      sessionStorage.setItem("chunk-reloaded", "1");
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900">
            Something went wrong loading this page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-[#f7433d] px-6 py-3 font-medium text-white"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  return (
    <Switch>
      {/* Protected Dashboard routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <Dashboard />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/usage">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <UsageStatistics />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/api-setup">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <APISetup />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/api-reference">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <APIReference />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/manage-plans">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <ManagePlans />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/billing-help">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <PaymentsBillingHelp />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/buy-credits">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <BuyCredits />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/live-tools">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <LiveTools />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      {/* Public pages with dynamic header based on auth status */}
      <Route path="/">
        <DynamicLayout>
          <Body />
        </DynamicLayout>
      </Route>

      <Route path="/tools">
        <DynamicLayout>
          <Tools />
        </DynamicLayout>
      </Route>

      <Route path="/contact">
        <DynamicLayout>
          <Contact />
        </DynamicLayout>
      </Route>

      <Route path="/pricing">
        <DynamicLayout>
          <Pricing />
        </DynamicLayout>
      </Route>

      <Route path="/about">
        <DynamicLayout>
          <About />
        </DynamicLayout>
      </Route>

      <Route path="/features">
        <DynamicLayout>
          <Features />
        </DynamicLayout>
      </Route>

      <Route path="/learn-more">
        <DynamicLayout>
          <LearnMore />
        </DynamicLayout>
      </Route>

      <Route path="/terms-of-service">
        <DynamicLayout>
          <TermsOfService />
        </DynamicLayout>
      </Route>

      <Route path="/privacy-policy">
        <DynamicLayout>
          <PrivacyPolicy />
        </DynamicLayout>
      </Route>

      <Route path="/refund-policy">
        <DynamicLayout>
          <RefundPolicy />
        </DynamicLayout>
      </Route>

      <Route path="/data-safety">
        <DynamicLayout>
          <DataSafety />
        </DynamicLayout>
      </Route>

      <Route path="/support">
        <DynamicLayout>
          <Support />
        </DynamicLayout>
      </Route>

      {/* Hidden admin dashboard. Standalone (no site nav), not linked anywhere,
          noindex; all data behind server-side admin auth. */}
      <Route path="/admin">
        <AdminPage />
      </Route>

      {/* Auth pages render standalone (no marketing nav) to match the mobile
          full-screen sheet design; AuthCard has its own close button. */}
      <Route path="/signup">
        <SignUp />
      </Route>

      <Route path="/signin">
        <SignIn />
      </Route>

      <Route path="/forgot-password">
        <DynamicLayout>
          <ForgotPassword />
        </DynamicLayout>
      </Route>

      <Route path="/reset-password">
        <DynamicLayout>
          <ResetPassword />
        </DynamicLayout>
      </Route>

      <Route path="/dashboard/profile">
        <ProtectedRoute>
          <DynamicLayout isDashboardPage={true}>
            <Profile />
          </DynamicLayout>
        </ProtectedRoute>
      </Route>

      {/* Upload pages for tools */}
      <Route path="/upload/word-to-pdf">
        <DynamicLayout>
          <WordToPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/restore-document">
        <DynamicLayout>
          <RestoreDocumentUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/lock-pdf">
        <DynamicLayout>
          <LockPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/unlock-pdf">
        <DynamicLayout>
          <UnlockPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/pdf-to-word">
        <DynamicLayout>
          <PdfToWordUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/pdf-to-excel">
        <DynamicLayout>
          <PdfToExcelUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/merge-pdfs">
        <DynamicLayout>
          <MergePdfsUpload />
        </DynamicLayout>
      </Route>

      {/* New PDF conversion tools */}
      <Route path="/upload/excel-to-pdf">
        <DynamicLayout>
          <ExcelToPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/powerpoint-to-pdf">
        <DynamicLayout>
          <PowerPointToPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/pdf-to-powerpoint">
        <DynamicLayout>
          <PdfToPowerPointUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/pdf-to-images">
        <DynamicLayout>
          <PdfToImagesUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/images-to-pdf">
        <DynamicLayout>
          <ImagesToPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/html-to-pdf">
        <DynamicLayout>
          <HtmlToPdfUpload />
        </DynamicLayout>
      </Route>

      {/* PDF document management tools */}
      <Route path="/upload/edit-pdf">
        <DynamicLayout>
          <EditPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/split-pdf">
        <DynamicLayout>
          <SplitPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/compress-pdf">
        <DynamicLayout>
          <CompressPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/compress-video">
        <DynamicLayout>
          <CompressVideoUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/rotate-pdf">
        <DynamicLayout>
          <RotatePdfUpload />
        </DynamicLayout>
      </Route>

      {/* PDF Editor tools (client-side) */}
      <Route path="/upload/crop-pdf">
        <DynamicLayout>
          <CropPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/sign-pdf">
        <DynamicLayout>
          <SignPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/watermark-pdf">
        <DynamicLayout>
          <WatermarkPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/add-image-pdf">
        <DynamicLayout>
          <AddImagePdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/delete-pages-pdf">
        <DynamicLayout>
          <DeletePagesPdfUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/ocr-pdf">
        <DynamicLayout>
          <OcrPdfUpload />
        </DynamicLayout>
      </Route>

      {/* Image editing tools */}
      <Route path="/upload/resize-image">
        <DynamicLayout>
          <ResizeImageUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/crop-image">
        <DynamicLayout>
          <CropImageUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/rotate-image">
        <DynamicLayout>
          <RotateImageUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/convert-image-format">
        <DynamicLayout>
          <ConvertImageFormatUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/compress-image">
        <DynamicLayout>
          <CompressImageUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/upscale-image">
        <DynamicLayout>
          <UpscaleImageUpload />
        </DynamicLayout>
      </Route>

      <Route path="/upload/remove-background">
        <DynamicLayout>
          <RemoveBackgroundUpload />
        </DynamicLayout>
      </Route>

      <Route path="/image-editor/resize">
        <DynamicLayout>
          <ResizeImageTool />
        </DynamicLayout>
      </Route>

      <Route path="/image-editor/crop">
        <DynamicLayout>
          <CropImageTool />
        </DynamicLayout>
      </Route>

      <Route path="/image-editor/rotate">
        <DynamicLayout>
          <RotateImageTool />
        </DynamicLayout>
      </Route>

      {/* Fallback to 404 */}
      <Route>
        <DynamicLayout>
          <NotFound />
        </DynamicLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Toaster />
            <LazyErrorBoundary>
              <Suspense fallback={<PageFallback />}>
                <Router />
              </Suspense>
            </LazyErrorBoundary>
          </WouterRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
