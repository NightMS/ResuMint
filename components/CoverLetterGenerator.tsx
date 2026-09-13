"use client";

import { useState, useMemo } from "react";
import { FileText, Loader2, Copy } from "lucide-react";

type ResumeItem = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  atsScore?: number;
};

type CoverLetterGeneratorProps = {
  resumes: ResumeItem[];
  activeResumeId: string;
  onSelectResume: (id: string) => void;
};

export function CoverLetterGenerator({
  resumes,
  activeResumeId,
  onSelectResume,
}: CoverLetterGeneratorProps) {
  const [targetRole, setTargetRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);

  // Sorted list: Active stays at the top, others sorted by updatedAt / createdAt (newest first)
  const sortedResumes = useMemo(() => {
    return [...resumes].sort((a, b) => {
      if (a.id === activeResumeId) return -1;
      if (b.id === activeResumeId) return 1;
      
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA; // Descending order (newest first)
    });
  }, [resumes, activeResumeId]);

  const handleGenerate = async () => {
    const targetId = activeResumeId;
    if (!targetId) return alert("Please select or load a resume version first.");
    
    setLoading(true);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeVersionId: targetId,
          targetRole,
          companyName,
          jobDescription,
        }),
      });

      const data = await res.json();

      // Check if the API request failed
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate cover letter");
      }

      setGeneratedCoverLetter(data.coverLetter.content);
    } catch (err: unknown) {
      console.error("Cover Letter generation failed", err);
      const message = err instanceof Error ? err.message : "Failed to generate cover letter.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="text-purple-400" size={24} /> Cover Letter Generator
        </h1>
        <p className="text-gray-400 text-sm">
          Generate tailored cover letters using Gemini 1.5 Flash based on your active resume.
        </p>
      </div>

      <div className="space-y-4 border border-gray-800 p-6 rounded-xl bg-gray-950">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Resume</label>
            <select
              value={activeResumeId}
              onChange={(e) => onSelectResume(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {sortedResumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)}... {r.atsScore ? `(Score: ${r.atsScore})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              placeholder="e.g. Google / Microsoft"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Target Role</label>
          <input
            type="text"
            placeholder="e.g. Full Stack Developer"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full p-3 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Job Description</label>
          <textarea
            placeholder="Paste Job Description..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={4}
            className="w-full p-3 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !targetRole}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors text-white"
        >
          {loading && <Loader2 className="animate-spin" size={16} />}
          Generate Cover Letter
        </button>
      </div>

      {generatedCoverLetter && (
        <div className="p-6 border border-gray-800 rounded-xl bg-gray-950 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <h3 className="font-semibold text-sm">Generated Letter Preview</h3>
            <button
              onClick={() => navigator.clipboard.writeText(generatedCoverLetter)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
            >
              <Copy size={14} /> Copy Text
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-300 leading-relaxed">
            {generatedCoverLetter}
          </pre>
        </div>
      )}
    </div>
  );
}