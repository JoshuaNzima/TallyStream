import ResultSubmissionForm from "@/components/result-submission-form";

export default function SubmitResults() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-submit-results-title">
          Submit Results
        </h2>
        <p className="text-gray-600">Enter polling center results and upload verification documents</p>
      </div>

      <ResultSubmissionForm />
    </div>
  );
}
