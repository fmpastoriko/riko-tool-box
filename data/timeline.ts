export type EntryType = "DA" | "DE" | "SWE";

export interface TimelineEntry {
  id: number;
  type: EntryType;
  year: string;
  role: string;
  company: string;
  problem: string;
  whatIBuilt: string;
  architecture: string[];
  impactSummary: string;
  impact: string[];
  tech: string[];
  note?: string;
}

export const timelineData: TimelineEntry[] = [
  {
    id: 1,
    type: "DA",
    year: "2019",
    role: "Data Analyst",
    company: "CV Graffiko",
    problem:
      "Publishing decisions for regional curriculum books were based mostly on intuition rather than structured market analysis, which is common for small publishing companies in remote areas.",
    whatIBuilt:
      "Designed a research and analytics workflow to collect demand data, analyze pricing, and forecast potential sales.",
    architecture: [
      "Field Data Collection",
      "Excel Data Processing",
      "Sales and Cost Analysis Model",
      "Reporting Dashboard",
    ],
    impactSummary:
      "Guided production and pricing decisions for 6 regional curriculum books using structured data analysis for the first time.",
    impact: [
      "Replaced intuition-based publishing decisions with a structured analytics workflow — first of its kind in the company",
      "Directly informed production and pricing for 6 regional curriculum books",
      "Introduced data-driven pricing strategy to the organization",
      "Produced post-production visualizations for ongoing decision-making",
    ],
    tech: ["Excel"],
  },
  {
    id: 2,
    type: "SWE",
    year: "2020",
    role: "Developer",
    company: "Graduate Project (Thesis)",
    problem:
      "Students struggle with Systems of Linear Equations in Two Variables because existing learning websites do not effectively support higher-order thinking, independent learning, or improved learning outcomes.",
    whatIBuilt:
      "Developed mathematics.web.id, a web-based learning platform designed to improve student performance, higher-order thinking skills, and learning independence.",
    architecture: [
      "Frontend: HTML / CSS / JavaScript",
      "Backend: PHP",
      "Database: MySQL",
    ],
    impactSummary:
      "Statistically proven to improve learning outcomes and higher-order thinking.",
    impact: [
      "Learning outcomes (Mann-Whitney U, p = 0.012): Experimental class significantly outperformed control class",
      "Higher-order thinking (Student's t, p = 0.016): Experimental class significantly outperformed control class",
      "Learning independence (Mann-Whitney U, p = 0.014): Experimental class significantly outperformed control class",
      "All hypotheses rejected at 5% significance level",
    ],
    tech: ["HTML", "CSS", "JavaScript", "PHP", "MySQL"],
    note: "The web is not up anymore. [Watch demo](https://drive.google.com/file/d/11gs-tQXzIrrnrPUH6kLcbVgz25N8Ao9T/view?usp=sharing) · [Read article](https://jme.ejournal.unsri.ac.id/index.php/jme/article/view/3799)",
  },
  {
    id: 3,
    type: "DA",
    year: "2021",
    role: "Data Analyst",
    company: "Zenius Education",
    problem: "Zenbot lacked visibility into trial performance.",
    whatIBuilt:
      "Analyzed trial performance, identified growth opportunities, and delivered actionable recommendations to improve retention and acquisition.",
    architecture: [
      "Raw Usage Data (BigQuery) + Google Form Questionnaire",
      "SQL Analysis and Segmentation + Qualitative Analysis",
      "Looker Studio and Google Sheets Reports",
      "Insights and Recommendations",
    ],
    impactSummary:
      "Identified growth opportunities and established Zenbot's first structured trial performance framework, driving measurable user growth.",
    impact: [
      "Recurrent users: +35% following recommendation implementation",
      "New users: +10%",
      "Established the first structured trial performance evaluation framework for Zenbot",
      "Analysis directly informed product and operations decisions",
    ],
    tech: ["BigQuery", "SQL", "Looker Studio", "Google Sheets"],
  },
  {
    id: 4,
    type: "DA",
    year: "2022",
    role: "Data Analyst",
    company: "Zenius Education",
    problem:
      "Telesales operations were costly relative to revenue and relied on expensive third-party tools.",
    whatIBuilt:
      "Tools cost analysis, then built internal tools using Google Sheets, Apps Script, and BigQuery to replace paid tools.",
    architecture: [
      "Cost Audit of Third Party Tools",
      "SQL Analysis in BigQuery",
      "Cost reduction",
      "Google Sheet + App Script automation to replace paid tools",
    ],
    impactSummary:
      "Reduced telesales operational costs by 20–30% per month by replacing paid third-party tools with in-house alternatives.",
    impact: [
      "Telesales cost reduced by 20–30% per month",
      "Replaced paid third-party tools with in-house tooling at no additional cost",
    ],
    tech: ["BigQuery", "SQL", "Google Sheets", "Apps Script"],
    note: "I can't provide more screenshots because I don't have access to those online service anymore. The tools were only available online, I didn't back them up personally.",
  },
  {
    id: 5,
    type: "SWE",
    year: "2023",
    role: "Software Engineer",
    company: "Zenius Education",
    problem:
      "Generating Tes Potensi Kognitif results was slow and required manual processing, around 15 minutes per report.",
    whatIBuilt:
      "Built an automated scoring and report generation system using Python integrated with Google Sheets.",
    architecture: [
      "Backend Automation: Python",
      "Data Storage: Google Sheets",
      "File Storage: Google Drive",
    ],
    impactSummary:
      "Automated TPK report generation, cutting processing time from 15 minutes to under 3 seconds.",
    impact: [
      "Report generation time: 15 minutes → under 3 seconds (300× faster)",
      "Eliminated manual processing step entirely",
      "System scales to thousands of students without additional operational load",
    ],
    tech: ["Python", "Google Sheets"],
  },
  {
    id: 6,
    type: "SWE",
    year: "2024",
    role: "Software Engineer / Data Analyst",
    company: "Moladin",
    problem:
      "The existing credit scoring workflow needed improvements to support new data sources and produce more reliable outputs.",
    whatIBuilt:
      "Enhanced the internal credit scoring analysis tool using Python to process XML inputs, generate Excel reports, and store results in BigQuery.",
    architecture: [
      "Input: XML Files",
      "Processing: Python Analysis Engine",
      "Output: Excel Reports",
      "Storage: BigQuery",
    ],
    impactSummary:
      "Extended the credit scoring tool to handle new XML data sources and produce structured Excel + BigQuery outputs, reducing manual analysis time.",
    impact: [
      "Enabled processing of new XML-based data sources previously unsupported",
      "Replaced manual analysis steps with automated Excel report generation",
      "Improved cross-team collaboration between product and risk via structured BigQuery outputs",
    ],
    tech: ["Python", "BigQuery", "SQL"],
  },
  {
    id: 7,
    type: "DA",
    year: "2025",
    role: "Senior Data Analyst",
    company: "Moladin",
    problem:
      "Teams often needed flexible Excel-friendly datasets for ad-hoc analysis that usual dashboards could not easily support.",
    whatIBuilt:
      "Built automated Google Sheets dashboards connected to BigQuery, some capable of generating reports without manual intervention.",
    architecture: [
      "BigQuery Data Warehouse",
      "SQL Data Layer",
      "Google Sheets Dashboards",
      "Apps Script Automation",
    ],
    impactSummary:
      "Reduced ad-hoc analyst requests by enabling non-technical teams to self-serve flexible datasets via automated Google Sheets dashboards.",
    impact: [
      "Non-technical teams can now self-serve datasets that previously required analyst involvement",
      "Reduced repetitive data pull requests to the analytics team",
      "Some dashboards generate reports fully automatically with no manual trigger",
    ],
    tech: ["BigQuery", "SQL", "Google Sheets", "Apps Script"],
  },
  {
    id: 8,
    type: "SWE",
    year: "2025",
    role: "Software Engineer",
    company: "Zenius / Primagama",
    problem: "Primagama competitions required a scalable digital LMS platform.",
    whatIBuilt:
      "Developed [NPMJ Site](https://npmj.primagama.co.id), an LMS platform for the New Primagama Mencari Juara competition.",
    architecture: ["Frontend: Vue", "Backend: Node.js", "Database: PostgreSQL"],
    impactSummary:
      "Delivered the LMS platform that made the New Primagama Mencari Juara competition possible at national scale.",
    impact: [
      "Enabled NPMJ competition to run entirely online at national scale",
      "Platform handled thousands of concurrent student participants",
    ],
    tech: ["Vue", "Node.js", "PostgreSQL"],
  },
  {
    id: 9,
    type: "SWE",
    year: "2025",
    role: "Software Engineer",
    company: "Zenius / Primagama",
    problem:
      "Primagama operations relied on manual bookkeeping and fragmented reporting.",
    whatIBuilt:
      "Built PRIDEX, a management system using Google Apps Script and Google Sheets.",
    architecture: [
      "Backend: Google Apps Script",
      "Database: Google Sheets",
      "Output: Financial Reporting Dashboard",
    ],
    impactSummary:
      "Replaced manual bookkeeping with a structured automated management system, giving Primagama its first real-time financial reporting visibility.",
    impact: [
      "Eliminated manual bookkeeping and fragmented reporting",
      "First structured data tracking system in Primagama operations",
      "Financial reporting now automated and visible in real time via Looker Studio",
    ],
    tech: [
      "Google Apps Script",
      "JavaScript",
      "Google Sheets",
      "Looker Studio",
    ],
  },
  {
    id: 10,
    type: "SWE",
    year: "2025",
    role: "Software Engineer",
    company: "Moladin",
    problem:
      "Various documents required manual preparation from multiple teams (appraisal, credit analyst, legal).",
    whatIBuilt:
      "Developed an end-to-end automation pipeline that generates pre-filled documents automatically.",
    architecture: [
      "Stream: Kafka Message Stream",
      "Database: MongoDB",
      "Backend: Python Automation Pipeline",
      "Output: Google Sheets and/or Google Docs",
      "Storage: Google Drive",
    ],
    impactSummary:
      "Fully automated document generation across appraisal, credit analyst, and legal teams by building an event-driven pipeline on Kafka + MongoDB.",
    impact: [
      "Eliminated manual document preparation across three teams (appraisal, credit analyst, legal)",
      "Documents now generated automatically on Kafka event — zero human trigger required",
      "Reduced cross-system coordination overhead and processing turnaround time",
    ],
    tech: ["Python", "Kafka", "MongoDB"],
  },
  {
    id: 11,
    type: "SWE",
    year: "2026",
    role: "Software Engineer",
    company: "Zenius / Primagama",
    problem:
      "Dancow Indonesia Cerdas is a national scale competition that required scalable LMS platforms.",
    whatIBuilt:
      "Developed [DIC Site](https://dic2026.primagama.co.id) for the Dancow Indonesia Cerdas competition.",
    architecture: ["Frontend: Vue", "Backend: Node.js", "Database: PostgreSQL"],
    impactSummary:
      "Delivered a nationwide LMS platform for the Dancow Indonesia Cerdas competition, handling large-scale student participation.",
    impact: [
      "Enabled nationwide online competition platform",
      "Handled large-scale student participation",
    ],
    tech: ["Vue", "Node.js", "PostgreSQL"],
  },
  {
    id: 12,
    type: "SWE",
    year: "2026",
    role: "Software Engineer / Data Analyst",
    company: "Moladin",
    problem:
      "Some of our data tools was not scalable if only using Google App Script.",
    whatIBuilt:
      "Developed an internal self-service data tool to streamline users' data needed.",
    architecture: [
      "Frontend: Vue.js",
      "Backend: Node.js",
      "Database: PostgreSQL",
    ],
    impactSummary:
      "Built a proper internal web app to replace Apps Script limitations, letting teams self-serve common data requests without analyst involvement.",
    impact: [
      "Unblocked data requests that Apps Script could not scale to handle",
      "Internal teams now self-serve without analyst involvement",
      "Faster turnaround for common data needs across the org",
    ],
    tech: ["Vue", "Node.js", "PostgreSQL"],
  },
];
