"use client";

import { useState, ChangeEvent, useEffect, useCallback, useMemo } from "react";
import { 
  FolderKanban, 
  FileEdit, 
  Target, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Upload,
  Eye
} from "lucide-react";
import { ResumeEditorModal, ResumePayload } from "@/components/ResumeEditorModal";
import { ATSChecker } from "@/components/ATSChecker";
import { CoverLetterGenerator } from "@/components/CoverLetterGenerator";
import  ResumeBuilder  from "@/components/ResumeBuilder";

type ResumeItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  atsScore?: number;
  atsApproved?: boolean;
  data?: ResumePayload;
};

type EvaluationResult = {
  score: number;
  isApproved: boolean;
  feedback: string;
};

export default function Dashboard() {
  // Navigation & Sidebar state
  const [activeTab, setActiveTab] = useState<"storage" | "builder" | "ats" | "cover">("storage");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // App Data & Loading states
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Modal Editor state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResumeId, setEditingResumeId] = useState<string>("");
  const [editingResumeData, setEditingResumeData] = useState<ResumePayload | null>(null);

  // Form states
  const [targetRole, setTargetRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeContent, setResumeContent] = useState("");

  // Outputs
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);

  // Synchronize formData whenever resumeContent changes
  const parsedFormData = useMemo(() => {
    if (!resumeContent) return null;
    try {
      return JSON.parse(resumeContent) as ResumePayload;
    } catch {
      return null;
    }
  }, [resumeContent]);

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm("Are you sure you want to delete this resume version?")) return;

    try {
      // Updated to match the [id] dynamic route folder structure
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMessage = "Failed to delete resume";
        try {
          const data = JSON.parse(text);
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = text || `Server error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Remove from local state
      setResumes((prev) => prev.filter((item) => item.id !== resumeId));

      // If the active resume was deleted, clear selection
      if (selectedResumeId === resumeId) {
        setSelectedResumeId("");
        setResumeContent("");
      }

      alert("Resume deleted successfully.");
    } catch (err: unknown) {
      console.error("Delete failed", err);
      const message = err instanceof Error ? err.message : "An error occurred while trying to delete the resume.";
      alert(message);
    }
  };

  const fetchStoredResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      
      if (Array.isArray(data.resumes) && data.resumes.length > 0) {
        // Find the absolute latest updated resume to default to
        const latestResume = [...data.resumes].sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        )[0];

        setResumes(data.resumes);
        setSelectedResumeId((prevId) => {
          if (!prevId) {
            if (latestResume.data) {
              setResumeContent(JSON.stringify(latestResume.data, null, 2));
            }
            return latestResume.id;
          }
          return prevId;
        });
      }
    } catch (err) {
      console.error("Failed to fetch resumes from database", err);
    }
  }, []);

  // Fetch on mount only
  useEffect(() => {
    const fetchStoredResumesOnMount = async () => {
      try {
        const res = await fetch("/api/resumes");
        const data = await res.json();
        
        if (Array.isArray(data.resumes) && data.resumes.length > 0) {
          const latestResume = [...data.resumes].sort(
            (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
          )[0];

          setResumes(data.resumes);
          setSelectedResumeId((prevId) => {
            if (!prevId) {
              if (latestResume.data) {
                setResumeContent(JSON.stringify(latestResume.data, null, 2));
              }
              return latestResume.id;
            }
            return prevId;
          });
        }
      } catch (err) {
        console.error("Failed to fetch resumes from database", err);
      }
    };

    fetchStoredResumesOnMount();
  }, []);

  // Derive active resume: defaults to manual selection or automatically falls back to the most recently updated resume
  const activeResumeId = useMemo(() => {
    if (selectedResumeId) return selectedResumeId;
    if (resumes.length === 0) return "";
    
    const latest = [...resumes].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    )[0];
    
    return latest?.id || "";
  }, [resumes, selectedResumeId]);

  // Sorted list: Active stays on top, others sorted by updatedAt (newest first)
  const sortedResumes = useMemo(() => {
    return [...resumes].sort((a, b) => {
      if (a.id === activeResumeId) return -1;
      if (b.id === activeResumeId) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [resumes, activeResumeId]);

  // Open Editor Modal helper
  const handleOpenModal = (resumeIdToEdit?: string, dataToEdit?: ResumePayload) => {
    const targetId = resumeIdToEdit || activeResumeId;
    
    if (dataToEdit) {
      setEditingResumeId(targetId);
      setEditingResumeData(dataToEdit);
      setIsModalOpen(true);
      return;
    }

    try {
      if (resumeContent) {
        const parsed = JSON.parse(resumeContent) as ResumePayload;
        setEditingResumeId(targetId);
        setEditingResumeData(parsed);
        setIsModalOpen(true);
      } else {
        alert("No resume data available to preview. Please select or import a resume first.");
      }
    } catch {
      alert("Invalid JSON format in resume content.");
    }
  };

  // 1. Hydrate / Fetch Resume from JSON on initial load
  const handleHydrate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hydrate", { method: "POST" });
      const data = await res.json();
      
      if (data.resumeVersionId) {
        const newItem: ResumeItem = {
          id: data.resumeVersionId,
          name: "Resume_Latest.json",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          atsScore: undefined,
          atsApproved: undefined,
          data: data.data,
        };
        setResumes((prev) => [newItem, ...prev]);
        setSelectedResumeId(data.resumeVersionId);
        setResumeContent(JSON.stringify(data.data, null, 2));
      }
    } catch (err) {
      console.error("Hydration failed", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Upload & Parse PDF Resume
  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();

      if (data.success && data.resumeVersionId) {
        const newItem: ResumeItem = {
          id: data.resumeVersionId,
          name: file.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          atsScore: undefined,
          atsApproved: undefined,
          data: data.data,
        };
        setResumes((prev) => [newItem, ...prev]);
        setSelectedResumeId(data.resumeVersionId);
        setResumeContent(JSON.stringify(data.data, null, 2));
        alert("PDF parsed and saved to database successfully!");
      } else {
        alert(`Error: ${data.error || "Failed to process PDF"}`);
      }
    } catch (err) {
      console.error("PDF Upload failed", err);
      alert("An error occurred during PDF processing.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // 3. Evaluate ATS
  const handleEvaluate = async () => {
    const targetId = selectedResumeId || activeResumeId;
    if (!targetId) return alert("Please select or load a resume version first.");
    setLoading(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVersionId: targetId, targetRole, jobDescription }),
      });
      const data = await res.json();
      setEvaluation(data.evaluation);

      setResumes((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? { ...item, atsScore: data.evaluation.score, atsApproved: data.evaluation.isApproved, updatedAt: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      console.error("Evaluation failed", err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Generate Cover Letter
  const handleGenerateCoverLetter = async () => {
    const targetId = selectedResumeId || activeResumeId;
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
      setGeneratedCoverLetter(data.coverLetter.content);
    } catch (err) {
      console.error("Cover Letter generation failed", err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: "storage", label: "Resume Storage", icon: FolderKanban },
    { id: "builder", label: "Resume Builder", icon: FileEdit },
    { id: "ats", label: "ATS Checker", icon: Target },
    { id: "cover", label: "Cover Letter", icon: FileText },
  ] as const;

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } transition-all duration-300 bg-gray-950 border-r border-gray-800 flex flex-col justify-between p-4 relative`}
      >
        <div>
          {/* Header & Toggle */}
          <div className="flex items-center justify-between mb-8">
            {!isCollapsed && <span className="text-xl font-bold text-blue-400">Hub.ai</span>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white mx-auto"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center" : "justify-start gap-3"
                  } p-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                      : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={20} />
                  {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Status Indicator */}
        {!isCollapsed && (
          <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400">
            Active Version: {activeResumeId ? activeResumeId.slice(0, 8) + "..." : "None"}
          </div>
        )}
      </aside>

      {/* Main Dynamic Workspace */}
      <main className="flex-1 overflow-y-auto p-8 bg-gray-900">
        {/* SECTION 1: RESUME STORAGE */}
        {activeTab === "storage" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Resume Storage</h1>
                <p className="text-gray-400 text-sm">Manage stored versions and view performance metrics.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* PDF Upload Button */}
                <label className="cursor-pointer flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
                  {isUploading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Upload size={16} />
                  )}
                  {isUploading ? "Parsing PDF with AI..." : "Upload Resume PDF"}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    disabled={isUploading || loading}
                    className="hidden"
                  />
                </label>

                {/* Import Local JSON Button */}
                <button
                  onClick={handleHydrate}
                  disabled={loading || isUploading}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  {loading && <Loader2 className="animate-spin" size={16} />}
                  Import Local Resume JSON
                </button>
              </div>
            </div>

            <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="p-4">Resume Version</th>
                    <th className="p-4">Updated At</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedResumes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-gray-500">
                        No resume versions loaded. Upload a PDF or click &quot;Import Local Resume JSON&quot; to populate.
                      </td>
                    </tr>
                  ) : (
                    sortedResumes.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-900/50">
                        <td className="p-4 font-mono text-xs text-blue-400">{res.id}</td>
                        <td className="p-4">{new Date(res.updatedAt || res.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResumeId(res.id);
                              if (res.data) setResumeContent(JSON.stringify(res.data, null, 2));
                            }}
                            className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                              activeResumeId === res.id
                                ? "bg-green-600/20 border-green-500 text-green-400"
                                : "border-gray-700 hover:bg-gray-800 text-gray-300"
                            }`}
                          >
                            {activeResumeId === res.id ? "Active" : "Select"}
                          </button>

                          {res.data && (
                            <button
                              type="button"
                              onClick={() => handleOpenModal(res.id, res.data)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                            >
                              <Eye size={12} /> Live PDF Editor
                            </button>
                          )}
                          <button
                          type="button"
                          onClick={() => handleDeleteResume(res.id)}
                          className="px-3 py-1.5 rounded text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-colors"
                        >
                          Delete
                        </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: RESUME BUILDER / UPDATER */}
        {activeTab === "builder" && <ResumeBuilder />}

        {/* SECTION 3: ATS CHECKER */}
        {activeTab === "ats" && (
          <ATSChecker data={parsedFormData || ({} as ResumePayload)} />
        )}
        
        {/* SECTION 4: COVER LETTER GENERATOR */}
        {activeTab === "cover" && (
          <CoverLetterGenerator 
            resumes={resumes} 
            activeResumeId={activeResumeId} 
            onSelectResume={setSelectedResumeId} 
          />
        )}
      </main>

      {/* 5. Resume Editor & Live PDF Viewer Modal */}
      {isModalOpen && editingResumeData && (
        <ResumeEditorModal
          key={editingResumeId}
          resumeId={editingResumeId}
          initialData={editingResumeData}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaveSuccess={fetchStoredResumes}
        />
      )}
    </div>
  );
}