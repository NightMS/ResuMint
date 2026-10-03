import { Document, Page, Text, View, Link, StyleSheet } from "@react-pdf/renderer";
import { ResumePayload } from "./ResumeEditorModal";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11, fontFamily: "Helvetica" },
  header: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 5 },
  name: { fontSize: 20, fontWeight: "bold" },
  title: { fontSize: 13, color: "#555" },
  contactRow: { flexDirection: "row", gap: 6, fontSize: 9, color: "#444", marginTop: 4, flexWrap: "wrap" },
  link: { color: "#2563EB", textDecoration: "none" },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 2, marginBottom: 5 },
  skillRow: { marginBottom: 3, fontSize: 10 },
  text: { marginBottom: 3 },
  bullet: { marginLeft: 10, marginBottom: 2 },
  dateText: { fontSize: 9, color: "#444" } // Added this style with a darker color (#444 instead of #666)
});

export const ResumePDFDocument = ({ data }: { data: ResumePayload }) => {
  // Move these inside the component so they can read the passed `data` prop properly!
  const visibleProjects = data?.projects?.filter((item) => !item.isHidden) || [];
  const visibleExperience = data?.experience?.filter((item) => !item.isHidden) || [];
  const visibleEducation = data?.education?.filter((item) => !item.isHidden) || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header / Basics */}
        <View style={styles.header}>
          <Text style={styles.name}>{data?.basics?.name || "Your Name"}</Text>
          <Text style={styles.title}>{data?.basics?.title || "Job Title"}</Text>
          
          <View style={styles.contactRow}>
            {data?.basics?.email && <Text>{data.basics.email}</Text>}
            {data?.basics?.phone && <Text>• {data.basics.phone}</Text>}
            {data?.basics?.github && (
              <Link src={data.basics.github} style={styles.link}>
                • GitHub
              </Link>
            )}
            {data?.basics?.linkedin && (
              <Link src={data.basics.linkedin} style={styles.link}>
                • LinkedIn
              </Link>
            )}
          </View>
        </View>

        {/* Summary */}
        {data?.basics?.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.text}>{data.basics.summary}</Text>
          </View>
        )}

        {/* Categorized Skills */}
        {data?.skillCategories && data.skillCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            {data.skillCategories.map((cat, i) => (
              <Text key={i} style={styles.skillRow}>
                <Text style={{ fontWeight: "bold" }}>{cat.category}: </Text>
                {cat.skills?.join(", ")}
              </Text>
            ))}
          </View>
        )}

        {/* Experience (Using visibleExperience) */}
        {visibleExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {visibleExperience.map((exp, index) => (
              <View key={index} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: "bold" }}>
                  {exp.position} — {exp.company}
                </Text>
                <Text style={{ fontSize: 9, color: "#222", fontWeight: "medium" }}>
                  {exp.startDate} - {exp.endDate}
                </Text>
                {exp.highlights?.map((h, i) => (
                  <Text key={i} style={styles.bullet}>• {h}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects (Using visibleProjects) */}
        {visibleProjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {visibleProjects.map((proj, index) => (
              <View key={index} style={{ marginBottom: 6 }}>
                <Text style={{ fontWeight: "bold" }}>{proj.name}</Text>
                {/* Fallback: if highlights exist, map them. Otherwise, split description by newlines */}
                {proj.highlights && proj.highlights.length > 0 ? (
                  proj.highlights.map((h, i) => (
                    <Text key={i} style={styles.bullet}>• {h}</Text>
                  ))
                ) : (
                  proj.description && 
                  proj.description.split("\n").map((line, i) => {
                    const cleanLine = line.trim().replace(/^[-•]\s*/, ""); // remove manual hyphens if typed
                    if (!cleanLine) return null;
                    return (
                      <Text key={i} style={styles.bullet}>• {cleanLine}</Text>
                    );
                  })
                )}
              </View>
            ))}
          </View>
        )}

        {/* Education (Using visibleEducation) */}
        {visibleEducation.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {visibleEducation.map((edu, index) => (
              <View key={index} style={{ marginBottom: 5 }}>
                <Text style={{ fontWeight: "bold" }}>
                  {edu.studyType} in {edu.area}
                </Text>
                <Text style={{ fontSize: 9, color: "#222" }}>
                  {edu.institution} ({edu.startDate} - {edu.endDate})
                </Text>
              </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  );
};