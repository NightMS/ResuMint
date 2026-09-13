"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ResumePDFDocument } from "./ResumePDFDocument";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface ResumePayload {
  basics?: {
    name?: string;
    title?: string;
    email?: string;
    github?: string;
    linkedin?: string;
    phone?: string;
    summary?: string;
  };
  skillCategories?: SkillCategory[];
  experience?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    highlights?: string[];
    isHidden?: boolean;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    highlights?: string[];
    url?: string;
    isHidden?: boolean;
  }>;
  education?: Array<{
    institution?: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    isHidden?: boolean;
  }>;
}

interface Props {
  resumeId: string;
  initialData: ResumePayload; // Kept in interface for prop compatibility if passed from parent
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export function ResumeEditorModal({
  resumeId,
  isOpen,
  onClose,
  onSaveSuccess,
}: Props) {
  // Initialize formData as completely blank
  const [formData, setFormData] = useState<ResumePayload>({
    basics: {
      name: "",
      title: "",
      email: "",
      github: "",
      linkedin: "",
      phone: "",
      summary: "",
    },
    skillCategories: [],
    experience: [],
    projects: [],
    education: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Basic Details Handler
  const handleBasicsChange = (
    field: keyof NonNullable<ResumePayload["basics"]>,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        [field]: value,
      },
    }));
  };

  // Skill Categories Handlers
  const addSkillCategory = () => {
    setFormData((prev) => ({
      ...prev,
      skillCategories: [
        ...(prev.skillCategories || []),
        { category: "", skills: [] },
      ],
    }));
  };

  const handleCategoryNameChange = (index: number, name: string) => {
    setFormData((prev) => {
      const updated = [...(prev.skillCategories || [])];
      updated[index] = { ...updated[index], category: name };
      return { ...prev, skillCategories: updated };
    });
  };

  const handleSkillsListChange = (index: number, skillsRaw: string) => {
    const skillsArray = skillsRaw.split(",").map((s) => s.trimStart());
    setFormData((prev) => {
      const updated = [...(prev.skillCategories || [])];
      updated[index] = { ...updated[index], skills: skillsArray };
      return { ...prev, skillCategories: updated };
    });
  };

  const removeSkillCategory = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skillCategories: (prev.skillCategories || []).filter((_, i) => i !== index),
    }));
  };

  // Experience Handlers
  const handleExperienceChange = (
    index: number,
    field: string,
    value: string | string[]
  ) => {
    setFormData((prev) => {
      const updated = [...(prev.experience || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, experience: updated };
    });
  };

  const addExperience = () => {
    setFormData((prev) => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        { company: "", position: "", startDate: "", endDate: "", highlights: [] },
      ],
    }));
  };

  const removeExperience = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== index),
    }));
  };

  // Projects Handlers
  const handleProjectChange = (
    index: number,
    field: string,
    value: string | string[]
  ) => {
    setFormData((prev) => {
      const updated = [...(prev.projects || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        { name: "", description: "", highlights: [], url: "" },
      ],
    }));
  };

  const removeProject = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      projects: (prev.projects || []).filter((_, i) => i !== index),
    }));
  };

  // Education Handlers
  const handleEducationChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...(prev.education || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        { institution: "", studyType: "", area: "", startDate: "", endDate: "" },
      ],
    }));
  };

  const removeEducation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index),
    }));
  };

  const toggleVisibility = (
    section: "experience" | "projects" | "education",
    index: number
  ) => {
    setFormData((prev) => {
      const list = [...(prev[section] || [])];
      list[index] = { ...list[index], isHidden: !list[index].isHidden };
      return { ...prev, [section]: list };
    });
  };

  // Save to Database via API
  const handleSaveChanges = async () => {
    if (!resumeId) {
      alert("Missing Resume ID. Cannot save changes.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData }),
      });

      if (!res.ok) throw new Error("Save failed");

      if (onSaveSuccess) onSaveSuccess();
      alert("Resume saved successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save resume changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const moveItem = (
    section: "experience" | "projects" | "education" | "skillCategories",
    index: number,
    direction: "up" | "down"
  ) => {
    setFormData((prev) => {
      const list = [...(prev[section] || [])];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      // Bounds check
      if (targetIndex < 0 || targetIndex >= list.length) return prev;

      // Swap elements
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;

      return { ...prev, [section]: list };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-7xl h-[90vh] rounded-lg flex flex-col overflow-hidden text-white">
        
        {/* Modal Header: Save and Cancel buttons only */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create & Preview Resume</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          
          {/* Left Side: Form Editor */}
          <div className="p-4 overflow-y-auto space-y-6 border-r border-slate-800">
            
            {/* Basic Details */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b border-slate-700 pb-1">Basic Details</h3>
              
              <div>
                <label className="text-xs text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData?.basics?.name || ""}
                  onChange={(e) => handleBasicsChange("name", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Job Title</label>
                <input
                  type="text"
                  value={formData?.basics?.title || ""}
                  onChange={(e) => handleBasicsChange("title", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Email</label>
                  <input
                    type="text"
                    value={formData?.basics?.email || ""}
                    onChange={(e) => handleBasicsChange("email", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData?.basics?.phone || ""}
                    onChange={(e) => handleBasicsChange("phone", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={formData?.basics?.github || ""}
                    onChange={(e) => handleBasicsChange("github", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={formData?.basics?.linkedin || ""}
                    onChange={(e) => handleBasicsChange("linkedin", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Summary</label>
                <textarea
                  rows={3}
                  value={formData?.basics?.summary || ""}
                  onChange={(e) => handleBasicsChange("summary", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Categorized Skills Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-1">
                <h3 className="text-lg font-semibold">Skills</h3>
                <button
                  type="button"
                  onClick={addSkillCategory}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-600"
                >
                  + Add Skill Section
                </button>
              </div>

              {formData?.skillCategories?.map((cat, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2 relative">
                  <div className="flex justify-between items-center gap-2">
                    <input
                      type="text"
                      placeholder="Category (e.g., Programming Languages)"
                      value={cat.category || ""}
                      onChange={(e) => handleCategoryNameChange(idx, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white flex-1 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => removeSkillCategory(idx)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Skills (comma separated, e.g., Java, Python, TypeScript)"
                    value={cat.skills?.join(", ") || ""}
                    onChange={(e) => handleSkillsListChange(idx, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
              ))}
            </div>

            {/* Experience Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-1">
                <h3 className="text-lg font-semibold">Experience</h3>
                <button
                  type="button"
                  onClick={addExperience}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-600"
                >
                  + Add Role
                </button>
              </div>

              {formData?.experience?.map((exp, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company || ""}
                      onChange={(e) => handleExperienceChange(idx, "company", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem("experience", idx, "up")}
                        disabled={idx === 0}
                        className="text-xs text-slate-300 hover:text-white px-1.5 py-1 bg-slate-900 rounded border border-slate-800 disabled:opacity-35"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem("experience", idx, "down")}
                        disabled={idx === (formData.experience?.length || 0) - 1}
                        className="text-xs text-slate-300 hover:text-white px-1.5 py-1 bg-slate-900 rounded border border-slate-800 disabled:opacity-35"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleVisibility("experience", idx)}
                        className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 bg-slate-900 rounded border border-slate-800"
                      >
                        {exp.isHidden ? "Unhide" : "Hide"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExperience(idx)}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Position Title"
                    value={exp.position || ""}
                    onChange={(e) => handleExperienceChange(idx, "position", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Start Date (e.g. Jan 2023)"
                      value={exp.startDate || ""}
                      onChange={(e) => handleExperienceChange(idx, "startDate", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="End Date (e.g. Present)"
                      value={exp.endDate || ""}
                      onChange={(e) => handleExperienceChange(idx, "endDate", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Highlights (separated by lines)"
                    value={exp.highlights?.join("\n") || ""}
                    onChange={(e) => handleExperienceChange(idx, "highlights", e.target.value.split("\n"))}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
              ))}
            </div>

            {/* Projects Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-1">
                <h3 className="text-lg font-semibold">Projects</h3>
                <button
                  type="button"
                  onClick={addProject}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-600"
                >
                  + Add Project
                </button>
              </div>

              {formData?.projects?.map((proj, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <input
                      type="text"
                      placeholder="Project Name"
                      value={proj.name || ""}
                      onChange={(e) => handleProjectChange(idx, "name", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem("projects", idx, "up")}
                        disabled={idx === 0}
                        className="text-xs text-slate-300 hover:text-white px-1.5 py-1 bg-slate-900 rounded border border-slate-800 disabled:opacity-35"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem("projects", idx, "down")}
                        disabled={idx === (formData.projects?.length || 0) - 1}
                        className="text-xs text-slate-300 hover:text-white px-1.5 py-1 bg-slate-900 rounded border border-slate-800 disabled:opacity-35"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleVisibility("projects", idx)}
                        className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 bg-slate-900 rounded border border-slate-800"
                      >
                        {proj.isHidden ? "Unhide" : "Hide"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProject(idx)}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Description / Tech stack"
                    value={proj.description || ""}
                    onChange={(e) => handleProjectChange(idx, "description", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
              ))}
            </div>

            {/* Education Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-1">
                <h3 className="text-lg font-semibold">Education</h3>
                <button
                  type="button"
                  onClick={addEducation}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-600"
                >
                  + Add Education
                </button>
              </div>

              {formData?.education?.map((edu, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <input
                      type="text"
                      placeholder="Institution (e.g., University Name)"
                      value={edu.institution || ""}
                      onChange={(e) => handleEducationChange(idx, "institution", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem("education", idx, "up")}
                        disabled={idx === 0}
                        className="text-xs text-slate-300 hover:text-white px-1.5 py-1 bg-slate-900 rounded border border-slate-800 disabled:opacity-35"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem("education", idx, "down")}
                        disabled={idx === (formData.education?.length || 0) - 1}
                        className="text-xs text-slate-300 hover:text-white px-1.5 py-1 bg-slate-900 rounded border border-slate-800 disabled:opacity-35"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleVisibility("education", idx)}
                        className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 bg-slate-900 rounded border border-slate-800"
                      >
                        {edu.isHidden ? "Unhide" : "Hide"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEducation(idx)}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Degree/Study Type (e.g. Bachelor)"
                      value={edu.studyType || ""}
                      onChange={(e) => handleEducationChange(idx, "studyType", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Field of Study / Area"
                      value={edu.area || ""}
                      onChange={(e) => handleEducationChange(idx, "area", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Start Date"
                      value={edu.startDate || ""}
                      onChange={(e) => handleEducationChange(idx, "startDate", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="End Date"
                      value={edu.endDate || ""}
                      onChange={(e) => handleEducationChange(idx, "endDate", e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Side: PDF Live Preview */}
          <div className="h-full bg-slate-950 flex items-center justify-center p-2">
            <PDFViewer key={JSON.stringify(formData)} className="w-full h-full rounded border-0">
              <ResumePDFDocument data={formData} />
            </PDFViewer>
          </div>

        </div>
      </div>
    </div>
  );
}