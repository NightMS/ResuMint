import React, { useMemo, useState } from "react";
import { ResumePayload } from "./ResumeEditorModal";

interface ATSCheckerProps {
  data: ResumePayload;
}

interface EvaluationResult {
  score: number;
  isApproved: boolean;
  feedback: string;
}

export const ATSChecker: React.FC<ATSCheckerProps> = ({ data }) => {
  // Tab control: 'structural' for your instant local checklist, 'ai' for Gemini job semantic evaluation
  const [activeTab, setActiveTab] = useState<"structural" | "ai">("structural");

  // AI Evaluator State
  const [inputMode, setInputMode] = useState<"select" | "upload">("select");
  const [resumeVersionId, setResumeVersionId] = useState("");
  const [rawResumeText, setRawResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  // Calculate structural ATS score based on best practices
  const analysis = useMemo(() => {
    let score = 0;
    const checks: { label: string; passed: boolean; tip: string }[] = [];

    // 1. Contact Information Check
    const hasName = Boolean(data?.basics?.name && data.basics.name.trim() !== "");
    const hasEmail = Boolean(data?.basics?.email && data.basics.email.includes("@"));
    const hasPhone = Boolean(data?.basics?.phone && data.basics.phone.trim() !== "");
    
    const contactPassed = hasName && hasEmail && hasPhone;
    score += contactPassed ? 25 : (hasName ? 15 : 0);
    checks.push({
      label: "Contact Information",
      passed: contactPassed,
      tip: "Ensure your name, valid email, and phone number are present in the header."
    });

    // 2. Summary Check
    const hasSummary = Boolean(data?.basics?.summary && data.basics.summary.trim().length > 20);
    score += hasSummary ? 15 : 0;
    checks.push({
      label: "Professional Summary",
      passed: hasSummary,
      tip: "Include a short summary highlighting your professional focus."
    });

    // 3. Skills Section Check
    const hasSkills = Boolean(data?.skillCategories && data.skillCategories.length > 0);
    score += hasSkills ? 20 : 0;
    checks.push({
      label: "Categorized Skills",
      passed: hasSkills,
      tip: "Parsers look for clearly defined skill categories with technical keywords."
    });

    // 4. Experience Section Check
    const visibleExp = data?.experience?.filter(e => !e.isHidden) || [];
    const hasExperience = visibleExp.length > 0;
    score += hasExperience ? 20 : 0;
    checks.push({
      label: "Work Experience Entries",
      passed: hasExperience,
      tip: "Include at least one unhidden work experience entry with dates."
    });

    // 5. Projects Section Check
    const visibleProjects = data?.projects?.filter(p => !p.isHidden) || [];
    const hasProjects = visibleProjects.length > 0;
    score += hasProjects ? 20 : 0;
    checks.push({
      label: "Projects & Portfolios",
      passed: hasProjects,
      tip: "Highlighting key projects improves technical evaluation scores."
    });

    return { score, checks };
  }, [data]);

  // Handle custom file upload and read as text
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawResumeText(event.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  // Submit handler for AI-powered evaluation route
  const handleAiEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEvaluation(null);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeVersionId: inputMode === "select" ? resumeVersionId : undefined,
          rawResumeText: inputMode === "upload" ? rawResumeText : undefined,
          targetRole,
          jobDescription,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Evaluation failed");

      setEvaluation(resData.evaluation);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white space-y-6">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold">ATS Checker & Evaluation Hub</h2>
          <p className="text-sm text-slate-400">
            Verify structural text parsing compatibility or run deep AI job matching.
          </p>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setActiveTab("structural")}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === "structural" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Structural Check
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              activeTab === "ai" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            AI Job Match
          </button>
        </div>
      </div>

      {/* TAB 1: STRUCTURAL CHECKLIST (Original functionality) */}
      {activeTab === "structural" && (
        <div className="space-y-6">
          {/* Score Overview Box */}
          <div className="flex items-center gap-6 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-700 w-24 h-24 rounded-full shrink-0">
              <span className={`text-3xl font-black ${analysis.score >= 80 ? "text-emerald-400" : analysis.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {analysis.score}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Out of 100</span>
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold text-base">
                {analysis.score >= 80 ? "Great ATS Compatibility" : "Structure Needs Improvement"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {analysis.score >= 80
                  ? "Your resume contains all critical structural anchors required for clean automated text extraction."
                  : "Review the checklist below to patch missing data sections that automated systems search for."}
              </p>
            </div>
          </div>

          {/* Breakdown Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Structural Checklist</h4>
            <div className="grid gap-2">
              {analysis.checks.map((check, index) => (
                <div 
                  key={index} 
                  className="flex items-start justify-between p-3 rounded bg-slate-950 border border-slate-800/80 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <span className={check.passed ? "text-emerald-400" : "text-red-400"}>
                        {check.passed ? "✔" : "✖"}
                      </span>
                      <span className="text-slate-200">{check.label}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] pl-5">{check.tip}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${check.passed ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-red-950 text-red-400 border border-red-900"}`}>
                    {check.passed ? "Passed" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI-POWERED JOB MATCHING & EVALUATION */}
      {activeTab === "ai" && (
        <form onSubmit={handleAiEvaluate} className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Source Resume Input</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode("select")}
                  className={`px-2.5 py-1 rounded text-[11px] ${inputMode === "select" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300"}`}
                >
                  Database ID
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  className={`px-2.5 py-1 rounded text-[11px] ${inputMode === "upload" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300"}`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {inputMode === "select" ? (
              <div>
                <input
                  type="text"
                  value={resumeVersionId}
                  onChange={(e) => setResumeVersionId(e.target.value)}
                  placeholder="Enter resumeVersionId (e.g. uuid from database)..."
                  className="w-full p-2.5 bg-slate-900 rounded border border-slate-700 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer bg-slate-900 p-2 rounded border border-slate-700"
                />
                {rawResumeText && (
                  <p className="text-[10px] text-emerald-400 mt-1">File loaded successfully ({rawResumeText.length} characters parsed).</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Target Role</label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Junior Web Developer"
              className="w-full p-2.5 bg-slate-950 rounded border border-slate-800 text-xs focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Job Description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description details here..."
              rows={4}
              className="w-full p-2.5 bg-slate-950 rounded border border-slate-800 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 rounded text-xs font-semibold transition"
          >
            {loading ? "Analyzing Semantic Match..." : "Run AI ATS Evaluation"}
          </button>

          {/* AI Results Output Container */}
          {evaluation && (
            <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs uppercase tracking-wider text-slate-400">Match Results</span>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${evaluation.isApproved ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-amber-950 text-amber-400 border border-amber-900"}`}>
                    {evaluation.isApproved ? "Interview Ready (>=75)" : "Needs Optimization (<75)"}
                  </span>
                  <span className="text-lg font-bold text-purple-400">{evaluation.score}/100</span>
                </div>
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-semibold text-slate-300">Recruiter Feedback & Analysis:</h5>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{evaluation.feedback}</p>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};