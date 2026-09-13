"use client";

import React, { useState, memo, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { pdf } from "@react-pdf/renderer";
import { Save, X, FileJson, FileText, Plus, Trash2, Download, ArrowUp, ArrowDown } from "lucide-react";
import { ResumePDFDocument } from "./ResumePDFDocument";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

interface ResumePayload {
  basics: {
    name: string;
    title: string;
    email: string;
    phone: string;
    summary: string;
    github: string;
    linkedin: string;
  };
  skillCategories: SkillCategory[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
}

interface SkillCategory {
  category: string;
  skills: string[];
}

interface ExperienceItem {
  position: string;
  company: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

interface ProjectItem {
  name: string;
  description: string;
  highlights: string[];
}

interface EducationItem {
  institution: string;
  studyType: string;
  area: string;
  startDate: string;
  endDate: string;
}

const blankResumePayload: ResumePayload = {
  basics: {
    name: "",
    title: "",
    email: "",
    phone: "",
    summary: "",
    github: "",
    linkedin: "",
  },
  skillCategories: [],
  experience: [],
  projects: [],
  education: [],
};

interface ResumeBuilderProps {
  onSave?: (data: ResumePayload) => void;
  onCancel?: () => void;
}

function ResumeBuilderComponent({ onSave, onCancel }: ResumeBuilderProps) {
  const [mode, setMode] = useState<"selector" | "json" | "pdf_form">("selector");
  
  // 1. Instant state for smooth typing response
  const [resumeData, setResumeData] = useState<ResumePayload>(blankResumePayload);
  
  // 2. Delayed state specifically to feed the heavy PDF generator without flickering
  const [debouncedData, setDebouncedData] = useState<ResumePayload>(blankResumePayload);

  const [jsonText, setJsonText] = useState("");

  // Sync debounced data after user pauses typing for 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedData(resumeData);
    }, 300);

    return () => clearTimeout(handler);
  }, [resumeData]);

  // Memoize the PDF document renderer instance so it only compiles when debounced data changes
  const memoizedPdfPreview = useMemo(() => {
    return (
      <PDFViewer className="w-full h-full rounded border-0">
        <ResumePDFDocument data={debouncedData} />
      </PDFViewer>
    );
  }, [debouncedData]);

  const handleSelectMode = (selectedMode: "json" | "pdf_form") => {
    setResumeData(blankResumePayload);
    setDebouncedData(blankResumePayload);
    if (selectedMode === "json") {
      setJsonText(JSON.stringify(blankResumePayload, null, 2));
    }
    setMode(selectedMode);
  };

  const moveItem = <T,>(list: T[], index: number, direction: "up" | "down"): T[] => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return list;
    const updated = [...list];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    return updated;
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await pdf(<ResumePDFDocument data={resumeData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${resumeData.basics.name ? resumeData.basics.name.toLowerCase().replace(/\s+/g, "-") : "resume"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF download:", error);
      alert("Could not generate PDF. Please check your data fields.");
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/resumes/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resumeData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save");
      }

      localStorage.setItem("saved_resume_data", JSON.stringify(resumeData));
      onSave?.(resumeData);

      alert("Changes saved to database successfully!");
      onCancel?.();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  if (mode === "selector") {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6 bg-gray-900 border border-gray-800 rounded-2xl text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Choose Resume Builder Mode</h1>
          <p className="text-gray-400 text-sm mt-1">Select how you would like to start drafting your resume.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <button
            type="button"
            onClick={() => handleSelectMode("json")}
            className="flex flex-col items-center justify-center p-6 bg-gray-950 border border-gray-800 hover:border-blue-500 rounded-xl transition-all group text-left space-y-3"
          >
            <div className="p-3 bg-blue-600/10 text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileJson size={28} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Blank JSON Editor</h3>
              <p className="text-gray-400 text-xs mt-1">Start from scratch using a raw schema payload structure.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode("pdf_form")}
            className="flex flex-col items-center justify-center p-6 bg-gray-950 border border-gray-800 hover:border-blue-500 rounded-xl transition-all group text-left space-y-3"
          >
            <div className="p-3 bg-blue-600/10 text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText size={28} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Structured Form & Preview</h3>
              <p className="text-gray-400 text-xs mt-1">Open the interactive split-screen layout with live PDF preview.</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "json") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-4 rounded-xl">
          <button onClick={() => setMode("selector")} className="text-xs text-gray-400 hover:text-white underline">
            ← Back to mode selector
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => onCancel?.()} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium">Cancel</button>
            <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium">Save Changes</button>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl space-y-3">
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Raw JSON Schema Payload</h2>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              try { 
                const parsed = JSON.parse(e.target.value);
                setResumeData(parsed); 
              } catch {}
            }}
            rows={18}
            className="w-full p-4 font-mono text-xs bg-gray-950 rounded-lg border border-gray-800 text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode("selector")} className="text-xs text-gray-400 hover:text-white underline">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-white">Edit & Preview Resume</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <X size={16} /> Close
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} /> Download PDF
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[80vh]">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-6 overflow-y-auto">
          
          {/* Basic Details Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-400">Basic Details</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                value={resumeData.basics.name}
                onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, name: e.target.value } })}
                className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Job Title</label>
              <input
                type="text"
                value={resumeData.basics.title}
                onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, title: e.target.value } })}
                className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="text"
                  value={resumeData.basics.email}
                  onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, email: e.target.value } })}
                  className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={resumeData.basics.phone}
                  onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, phone: e.target.value } })}
                  className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">LinkedIn URL</label>
                <input
                  type="text"
                  value={resumeData.basics.linkedin}
                  onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, linkedin: e.target.value } })}
                  className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">GitHub URL</label>
                <input
                  type="text"
                  value={resumeData.basics.github}
                  onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, github: e.target.value } })}
                  className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Summary</label>
              <textarea
                value={resumeData.basics.summary}
                rows={3}
                onChange={(e) => setResumeData({ ...resumeData, basics: { ...resumeData.basics, summary: e.target.value } })}
                className="w-full p-2.5 bg-gray-950 rounded-lg border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Skills Section */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-400">Skills</h3>
              <button
                type="button"
                onClick={() => setResumeData({ ...resumeData, skillCategories: [...(resumeData.skillCategories || []), { category: "", skills: [] }] })}
                className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded transition-colors"
              >
                <Plus size={12} /> Add Skill Category
              </button>
            </div>
            {resumeData.skillCategories?.map((cat, index) => (
              <div key={index} className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2 relative">
                <button
                  type="button"
                  onClick={() => {
                    const newCats = resumeData.skillCategories.filter((_, i) => i !== index);
                    setResumeData({ ...resumeData, skillCategories: newCats });
                  }}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="text"
                  placeholder="Category (e.g. Languages)"
                  value={cat.category}
                  onChange={(e) => {
                    const newCats = [...resumeData.skillCategories];
                    newCats[index].category = e.target.value;
                    setResumeData({ ...resumeData, skillCategories: newCats });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Skills (comma separated, e.g. Java, React, Node)"
                  value={cat.skills?.join(", ") || ""}
                  onChange={(e) => {
                    const newCats = [...resumeData.skillCategories];
                    newCats[index].skills = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                    setResumeData({ ...resumeData, skillCategories: newCats });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Experience Section */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-400">Experience</h3>
              <button
                type="button"
                onClick={() => setResumeData({ ...resumeData, experience: [...(resumeData.experience || []), { position: "", company: "", startDate: "", endDate: "", highlights: [] }] })}
                className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded transition-colors"
              >
                <Plus size={12} /> Add Experience
              </button>
            </div>
            {resumeData.experience?.map((exp, index) => (
              <div key={index} className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2 relative">
                <div className="absolute top-2 right-8 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setResumeData({ ...resumeData, experience: moveItem(resumeData.experience, index, "up") })}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={index === resumeData.experience.length - 1}
                    onClick={() => setResumeData({ ...resumeData, experience: moveItem(resumeData.experience, index, "down") })}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newExp = resumeData.experience.filter((_, i) => i !== index);
                    setResumeData({ ...resumeData, experience: newExp });
                  }}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="text"
                  placeholder="Position / Role"
                  value={exp.position}
                  onChange={(e) => {
                    const newExp = [...resumeData.experience];
                    newExp[index].position = e.target.value;
                    setResumeData({ ...resumeData, experience: newExp });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={exp.company}
                  onChange={(e) => {
                    const newExp = [...resumeData.experience];
                    newExp[index].company = e.target.value;
                    setResumeData({ ...resumeData, experience: newExp });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Start Date (e.g. Jan 2025)"
                    value={exp.startDate}
                    onChange={(e) => {
                      const newExp = [...resumeData.experience];
                      newExp[index].startDate = e.target.value;
                      setResumeData({ ...resumeData, experience: newExp });
                    }}
                    className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="End Date (e.g. Present)"
                    value={exp.endDate}
                    onChange={(e) => {
                      const newExp = [...resumeData.experience];
                      newExp[index].endDate = e.target.value;
                      setResumeData({ ...resumeData, experience: newExp });
                    }}
                    className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <textarea
                  placeholder="Highlights (one per line)"
                  rows={2}
                  value={exp.highlights?.join("\n") || ""}
                  onChange={(e) => {
                    const newExp = [...resumeData.experience];
                    newExp[index].highlights = e.target.value.split("\n");
                    setResumeData({ ...resumeData, experience: newExp });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Projects Section */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-400">Projects</h3>
              <button
                type="button"
                onClick={() => setResumeData({ ...resumeData, projects: [...(resumeData.projects || []), { name: "", description: "", highlights: [] }] })}
                className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded transition-colors"
              >
                <Plus size={12} /> Add Project
              </button>
            </div>
            {resumeData.projects?.map((proj, index) => (
              <div key={index} className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2 relative">
                <div className="absolute top-2 right-8 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setResumeData({ ...resumeData, projects: moveItem(resumeData.projects, index, "up") })}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={index === resumeData.projects.length - 1}
                    onClick={() => setResumeData({ ...resumeData, projects: moveItem(resumeData.projects, index, "down") })}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newProj = resumeData.projects.filter((_, i) => i !== index);
                    setResumeData({ ...resumeData, projects: newProj });
                  }}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="text"
                  placeholder="Project Name"
                  value={proj.name}
                  onChange={(e) => {
                    const newProj = [...resumeData.projects];
                    newProj[index].name = e.target.value;
                    setResumeData({ ...resumeData, projects: newProj });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Short Description"
                  value={proj.description}
                  onChange={(e) => {
                    const newProj = [...resumeData.projects];
                    newProj[index].description = e.target.value;
                    setResumeData({ ...resumeData, projects: newProj });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
                <textarea
                  placeholder="Highlights (one per line)"
                  rows={2}
                  value={proj.highlights?.join("\n") || ""}
                  onChange={(e) => {
                    const newProj = [...resumeData.projects];
                    newProj[index].highlights = e.target.value.split("\n");
                    setResumeData({ ...resumeData, projects: newProj });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Education Section */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-400">Education</h3>
              <button
                type="button"
                onClick={() => setResumeData({ ...resumeData, education: [...(resumeData.education || []), { institution: "", studyType: "", area: "", startDate: "", endDate: "" }] })}
                className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded transition-colors"
              >
                <Plus size={12} /> Add Education
              </button>
            </div>
            {resumeData.education?.map((edu, index) => (
              <div key={index} className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2 relative">
                <div className="absolute top-2 right-8 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setResumeData({ ...resumeData, education: moveItem(resumeData.education, index, "up") })}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={index === resumeData.education.length - 1}
                    onClick={() => setResumeData({ ...resumeData, education: moveItem(resumeData.education, index, "down") })}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newEdu = resumeData.education.filter((_, i) => i !== index);
                    setResumeData({ ...resumeData, education: newEdu });
                  }}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="text"
                  placeholder="Institution (e.g. Asia Pacific University)"
                  value={edu.institution}
                  onChange={(e) => {
                    const newEdu = [...resumeData.education];
                    newEdu[index].institution = e.target.value;
                    setResumeData({ ...resumeData, education: newEdu });
                  }}
                  className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Study Type (e.g. Bachelor)"
                    value={edu.studyType}
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[index].studyType = e.target.value;
                      setResumeData({ ...resumeData, education: newEdu });
                    }}
                    className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Area (e.g. Software Engineering)"
                    value={edu.area}
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[index].area = e.target.value;
                      setResumeData({ ...resumeData, education: newEdu });
                    }}
                    className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Start Date"
                    value={edu.startDate}
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[index].startDate = e.target.value;
                      setResumeData({ ...resumeData, education: newEdu });
                    }}
                    className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="End Date"
                    value={edu.endDate}
                    onChange={(e) => {
                      const newEdu = [...resumeData.education];
                      newEdu[index].endDate = e.target.value;
                      setResumeData({ ...resumeData, education: newEdu });
                    }}
                    className="w-full p-2 bg-gray-900 rounded border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Live Preview Panel using memoized layout */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-2 flex items-center justify-center h-full">
          {memoizedPdfPreview}
        </div>

      </div>
    </div>
  );
}

const ResumeBuilder = memo(ResumeBuilderComponent);
export default ResumeBuilder;