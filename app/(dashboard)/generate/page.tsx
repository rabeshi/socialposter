import { GenerateForm } from "@/components/forms/generate-form";

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual Generator</h1>
        <p className="text-muted-foreground">Generate a batch of 3 candidates outside the automated schedule.</p>
      </div>
      <GenerateForm />
    </div>
  );
}
