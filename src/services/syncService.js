const axios = require("axios");
const Student = require("../models/Student");
const Company = require("../models/Company");
const Drive = require("../models/Drive");
const Application = require("../models/Application");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const SYNC_API_URL    = process.env.SYNC_API_URL    || "https://t4e-testserver.onrender.com/api";
const SYNC_STUDENT_ID = process.env.SYNC_STUDENT_ID || "E0123019";
const SYNC_PASSWORD   = process.env.SYNC_PASSWORD   || "910131";
const SYNC_SET        = process.env.SYNC_SET        || "setA";

// ─── Sanitization ─────────────────────────────────────────────────────────────

const capitalizeName = (str) => {
  if (!str || typeof str !== "string") return str;
  return str.trim().split(" ").filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const sanitizeEmail = (str) => {
  if (!str || typeof str !== "string") return str;
  return str.trim().toLowerCase();
};

const sanitizeStr = (str) => {
  if (!str || typeof str !== "string") return str;
  return str.trim();
};

const sanitizeDept = (str) => {
  if (!str || typeof str !== "string") return str;
  return str.trim().toUpperCase();
};

// ─── Validation ───────────────────────────────────────────────────────────────

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidCGPA  = (cgpa)  => typeof cgpa === "number" && cgpa >= 0 && cgpa <= 10;
const isValidDate  = (d)     => d && !isNaN(new Date(d).getTime());

// ─── Step 1: Get Auth Token ────────────────────────────────────────────────────

const getAuthToken = async () => {
  const payload = {
    studentId: SYNC_STUDENT_ID,
    password:  SYNC_PASSWORD,
    set:       SYNC_SET,
  };

  console.log(`🔄 Sync: Fetching token for ${payload.studentId} (set: ${payload.set})`);

  const response = await axios.post(`${SYNC_API_URL}/public/token`, payload, {
    timeout: 20000,
  });

  const token   = response.data.token || response.data.data?.token || response.data.accessToken;
  const dataUrl = response.data.dataUrl || "/private/data";

  if (!token) throw new Error("No token returned from server");

  console.log(`✅ Token received. dataUrl: ${dataUrl}`);
  return { token, dataUrl };
};

// ─── Step 2: Fetch Dataset ────────────────────────────────────────────────────

const fetchDataset = async (token, dataUrl) => {
  const response = await axios.get(`${SYNC_API_URL}${dataUrl}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20000,
  });
  return response.data.data || response.data;
};

// ─── Step 3: Sync Students ────────────────────────────────────────────────────

const syncStudents = async (students) => {
  let inserted = 0, duplicates = 0, rejected = 0;

  for (const s of students) {
    try {
      const name       = capitalizeName(s.name);
      const email      = sanitizeEmail(s.email);
      const department = sanitizeDept(s.department);
      const studentId  = sanitizeStr(s.studentId || s.id || String(s._id));

      // Validate
      if (!studentId || !name || !email)          { rejected++; continue; }
      if (!isValidEmail(email))                   { rejected++; continue; }
      if (s.cgpa !== undefined && !isValidCGPA(Number(s.cgpa))) { rejected++; continue; }

      const doc = {
        studentId,
        name,
        email,
        phone:          sanitizeStr(s.phone) || "",
        cgpa:           parseFloat(s.cgpa)   || 0,
        department,
        skills:         Array.isArray(s.skills) ? s.skills.map(sanitizeStr) : [],
        graduationYear: s.graduationYear || s.batch || null,
        status:         s.status || "active",
      };

      const existing = await Student.findOne({ studentId });
      if (existing) {
        duplicates++;
      } else {
        await Student.create(doc);
        inserted++;
      }

      // Create user login for student
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(studentId, 10);
        await User.create({
          name,
          email,
          password: hashedPassword,
          role: "student",
        });
      }
    } catch (e) {
      if (e.code === 11000) { duplicates++; }
      else { rejected++; }
    }
  }

  return { inserted, duplicates, rejected };
};

// ─── Step 4: Sync Companies ───────────────────────────────────────────────────

const syncCompanies = async (companies) => {
  let inserted = 0, duplicates = 0, rejected = 0;

  for (const c of companies) {
    try {
      const name      = capitalizeName(c.name);
      const companyId = sanitizeStr(c.companyId || c.id || String(c._id));

      if (!companyId || !name) { rejected++; continue; }

      const doc = {
        companyId,
        name,
        role:                sanitizeStr(c.role) || "",
        package:             c.package || null,
        eligibleDepartments: Array.isArray(c.eligibleDepartments)
                               ? c.eligibleDepartments.map(sanitizeDept) : [],
        minimumCgpa:         c.minimumCgpa || 0,
        driveDate:           isValidDate(c.driveDate) ? new Date(c.driveDate) : null,
        status:              c.status || "active",
      };

      const existing = await Company.findOne({ companyId });
      if (existing) {
        duplicates++;
      } else {
        await Company.create(doc);
        inserted++;
      }
    } catch (e) {
      if (e.code === 11000) { duplicates++; }
      else { rejected++; }
    }
  }

  return { inserted, duplicates, rejected };
};

// ─── Step 5: Sync Drives ──────────────────────────────────────────────────────

const syncDrives = async (drives) => {
  let inserted = 0, duplicates = 0, rejected = 0;

  for (const d of drives) {
    try {
      const driveId = sanitizeStr(d.driveId || d.id || String(d._id));
      if (!driveId || !d.title) { rejected++; continue; }

      // Resolve company reference
      let companyRef = null;
      if (d.company && typeof d.company === "object") {
        const fc = await Company.findOne({ companyId: d.company.companyId })
                || await Company.findOne({ name: { $regex: `^${d.company.name}$`, $options: "i" } });
        companyRef = fc?._id;
      } else if (d.companyId) {
        const fc = await Company.findOne({ companyId: d.companyId });
        companyRef = fc?._id;
      } else if (d.company && typeof d.company === "string") {
        const fc = await Company.findOne({ name: { $regex: d.company, $options: "i" } });
        companyRef = fc?._id;
      }

      if (!companyRef) { rejected++; continue; }

      const doc = {
        driveId,
        company:              companyRef,
        title:                sanitizeStr(d.title),
        mode:                 d.mode || "offline",
        location:             sanitizeStr(d.location) || "",
        registrationDeadline: isValidDate(d.registrationDeadline) ? new Date(d.registrationDeadline) : null,
        rounds:               Array.isArray(d.rounds) ? d.rounds : [],
        status:               d.status || "open",
      };

      const existing = await Drive.findOne({ driveId });
      if (existing) {
        duplicates++;
      } else {
        await Drive.create(doc);
        inserted++;
      }
    } catch (e) {
      if (e.code === 11000) { duplicates++; }
      else { rejected++; }
    }
  }

  return { inserted, duplicates, rejected };
};

// ─── Step 6: Sync Applications ────────────────────────────────────────────────

const syncApplications = async (applications) => {
  let inserted = 0, duplicates = 0, rejected = 0;

  for (const a of applications) {
    try {
      const applicationId = sanitizeStr(a.applicationId || a.id || String(a._id));
      if (!applicationId) { rejected++; continue; }

      // Resolve student
      const stuId = a.student?.studentId || a.student;
      const student = await Student.findOne({ studentId: stuId }) || await Student.findById(stuId).catch(() => null);
      if (!student) { rejected++; continue; }

      // Resolve drive
      const drvId = a.drive?.driveId || a.drive;
      const drive = await Drive.findOne({ driveId: drvId }) || await Drive.findById(drvId).catch(() => null);
      if (!drive) { rejected++; continue; }

      const doc = {
        applicationId,
        student:      student._id,
        drive:        drive._id,
        currentRound: sanitizeStr(a.currentRound || "Applied"),
        status:       ["applied","shortlisted","selected","rejected"].includes(a.status) ? a.status : "applied",
        appliedAt:    isValidDate(a.appliedAt) ? new Date(a.appliedAt) : new Date(),
      };

      const existing = await Application.findOne({ applicationId });
      if (existing) {
        duplicates++;
      } else {
        await Application.create(doc);
        inserted++;
      }
    } catch (e) {
      if (e.code === 11000) { duplicates++; }
      else { rejected++; }
    }
  }

  return { inserted, duplicates, rejected };
};

// ─── Main performSync ─────────────────────────────────────────────────────────

const performSync = async () => {
  const { token, dataUrl } = await getAuthToken();
  const dataset = await fetchDataset(token, dataUrl);

  const students     = dataset.students     || dataset.Students     || [];
  const companies    = dataset.companies    || dataset.Companies    || [];
  const drives       = dataset.drives       || dataset.Drives       || [];
  const applications = dataset.applications || dataset.Applications || [];

  const totalFetched = students.length + companies.length + drives.length + applications.length;
  console.log(`📦 Fetched: ${students.length} students, ${companies.length} companies, ${drives.length} drives, ${applications.length} applications`);

  // Order matters: companies → drives → students → applications
  const cResult = await syncCompanies(companies);
  const sResult = await syncStudents(students);
  const dResult = await syncDrives(drives);
  const aResult = await syncApplications(applications);

  const inserted   = sResult.inserted   + cResult.inserted   + dResult.inserted   + aResult.inserted;
  const duplicates = sResult.duplicates + cResult.duplicates + dResult.duplicates + aResult.duplicates;
  const rejected   = sResult.rejected   + cResult.rejected   + dResult.rejected   + aResult.rejected;

  console.log(`✅ Sync complete — inserted: ${inserted}, duplicates: ${duplicates}, rejected: ${rejected}`);

  return { totalFetched, inserted, duplicates, rejected };
};

module.exports = { performSync };
