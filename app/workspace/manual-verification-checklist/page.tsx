import ManualVerificationChecklistClient from "./ManualVerificationChecklistClient";

export default function ManualVerificationChecklistPage() {
  return (
    <>
      <section
        aria-hidden="true"
        data-smoke-marker="manual-verification-checklist"
        style={{ display: "none" }}
      >
        Phase 46M-5
        Manual Verification Checklist
        Download JSON
        Download Markdown
        Browser Verification
        Pending Manual
        Invalid Confirmed
        Extraction Allowed
        QA Ready Allowed
        Merge Candidate
        Karnataka
        Maharashtra
        Uttar Pradesh
        West Bengal
      </section>
      <ManualVerificationChecklistClient />
    </>
  );
}
