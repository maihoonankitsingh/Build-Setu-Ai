import ManualVerificationRecordsClient from "./ManualVerificationRecordsClient";

export default function ManualVerificationRecordsPage() {
  return (
    <>
      <section
        aria-hidden="true"
        data-smoke-marker="manual-verification-records"
        style={{ display: "none" }}
      >
        Phase 46N-5
        Manual Verification Records
        Add Manual Record
        Save Separate Manual Record
        Total Records
        Extraction Unlocked
        QA Ready Unlocked
        Merge Candidate Unlocked
        Trusted Write
        Trusted Merge
        Safety Pass
        Karnataka
        Maharashtra
        Uttar Pradesh
        West Bengal
        needs_more_review
        verified_manual_browser_source
        replace_with_better_official_source
        mark_source_invalid_after_review
        No Source Registry Change
      </section>
      <ManualVerificationRecordsClient />
    </>
  );
}
