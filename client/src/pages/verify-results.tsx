import VerificationInterface from "@/components/verification-interface";

export default function VerifyResults() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-verify-results-title">
          Verify Results
        </h2>
        <p className="text-gray-600">Review and verify submitted results</p>
      </div>

      <VerificationInterface />
    </div>
  );
}
