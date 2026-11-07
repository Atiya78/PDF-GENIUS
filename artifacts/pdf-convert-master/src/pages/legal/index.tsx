import { LegalPage } from "./LegalPage";
import { DeleteAccountPanel } from "@/components/legal/DeleteAccountPanel";

export const TermsPage = () => <LegalPage slug="terms" path="/terms" />;
export const PrivacyPage = () => <LegalPage slug="privacy" path="/privacy" />;
export const RefundPolicyPage = () => <LegalPage slug="refund-policy" path="/refund-policy" />;
export const CancellationPolicyPage = () => <LegalPage slug="cancellation-policy" path="/cancellation-policy" />;
export const CookiePolicyPage = () => <LegalPage slug="cookie-policy" path="/cookie-policy" />;
export const AcceptableUsePage = () => <LegalPage slug="acceptable-use" path="/acceptable-use" />;
export const AiPolicyPage = () => <LegalPage slug="ai-policy" path="/ai-policy" />;
export const DmcaPage = () => <LegalPage slug="dmca" path="/dmca" />;
export const DisclaimerPage = () => <LegalPage slug="disclaimer" path="/disclaimer" />;
export const DeleteAccountPage = () => (
  <LegalPage slug="delete-account" path="/delete-account">
    <DeleteAccountPanel />
  </LegalPage>
);
