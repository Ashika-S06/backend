/**
 * Dataset Service
 * Credentials: StudentID = E0123019, Password = 910131
 *
 * Pipeline:
 *  1. Auth  — tries every known field-name combo to get JWT token
 *  2. Fetch — paginated GET on all 4 collections
 *  3. Validate — rejects bad records (invalid cgpa, email, missing IDs, etc.)
 *  4. Sanitize — trims strings, normalises enums, clamps numbers
 *  5. Persist — clears old data, inserts only valid records
 */

const axios = require('axios').default;
const Student     = require('../models/Student');
const Company     = require('../models/Company');
const Drive       = require('../models/Drive');
const Application = require('../models/Application');
const fallbackDataset = require('./fallbackDataset.json');

const BASE_URL   = process.env.DATASET_URL        || 'https://t4e-testserver.onrender.com/api';
const STUDENT_ID = process.env.DATASET_STUDENT_ID || 'E0123019';
const PASSWORD   = process.env.DATASET_PASSWORD   || '910131';
const NAME       = process.env.DATASET_NAME       || 'ASHIKA S';
const ENABLE_LOCAL_FALLBACK = process.env.DATASET_USE_FALLBACK !== 'false';
const FORCE_LOCAL_DATASET = process.env.DATASET_FORCE_LOCAL === 'true';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

// ─── 1. AUTH ──────────────────────────────────────────────────────────────────
// The assessment doc says: email = student email from dataset, password = student ID
// We try every possible field name the server might use

function buildCombos() {
  const id  = STUDENT_ID;                          // E0123019
  const pw  = PASSWORD;                            // 910131
  const em1 = `${id.toLowerCase()}@sriher.edu.in`; // e0123019@sriher.edu.in
  const em2 = `${id}@sriher.edu.in`;               // E0123019@sriher.edu.in

  return [
    // Standard email + password
    { email: em1, password: pw },
    { email: em2, password: pw },
    { email: id,  password: pw },
    // studentId field
    { studentId: id, password: pw },
    // uniqueId field
    { uniqueId: id,  password: pw },
    // username field
    { username: id,  password: pw },
    // id field
    { id: id, password: pw },
    // rollNo variations
    { rollNo: id, password: pw },
    { rollNumber: id, password: pw },
    // Password = studentId (as the doc says "password = student ID from dataset")
    { email: em1, password: id },
    { email: em2, password: id },
    { studentId: id, password: id },
    // All with name
    { email: em1, password: pw, name: NAME },
    { studentId: id, password: pw, name: NAME },
  ];
}

async function tryLogin(body) {
  try {
    // First try register (creates account if it doesn't exist)
    try {
      const reg = await http.post('/auth/register', { ...body, name: NAME });
      const t = reg.data?.data?.token || reg.data?.token;
      if (t) return t;
    } catch (_) { /* 409 already exists = fine */ }

    // Then login
    const res = await http.post('/auth/login', body);
    return res.data?.data?.token || res.data?.token || res.data?.accessToken || null;
  } catch {
    return null;
  }
}

async function getAuthToken() {
  console.log(`[auth] StudentID=${STUDENT_ID}  Password=${PASSWORD}`);
  console.log('[auth] Trying credential combinations...');

  for (const combo of buildCombos()) {
    const token = await tryLogin(combo);
    if (token) {
      console.log(`[auth] ✅ Got token with: ${JSON.stringify(combo)}`);
      return token;
    }
  }

  throw new Error(
    '\n❌ All credential combinations failed.\n' +
    '   The test server is returning {"message":"API is running"} for every route.\n' +
    '   This is a server-side misconfiguration — all routes are caught by a wildcard.\n\n' +
    '   SOLUTIONS:\n' +
    '   1. Ask your instructor to fix the server (wildcard route blocks all real routes)\n' +
    '   2. If you receive a token directly, run:\n' +
    '      node src/utils/seeder.js --token=<paste_token_here>\n' +
    '   3. To use the built-in local fallback dataset, set DATASET_USE_FALLBACK=true\n'
  );
}

function loadFallbackDataset() {
  console.warn('[dataset] Using local fallback dataset due to remote sync failure.');
  return fallbackDataset;
}

// ─── 2. FETCH WITH PAGINATION ─────────────────────────────────────────────────

async function fetchPaged(endpoint, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const all = [];
  let page = 1;
  while (true) {
    const res = await http.get(`${endpoint}?page=${page}&limit=100`, { headers });
    const body = res.data;
    const items = Array.isArray(body?.data) ? body.data
                : Array.isArray(body)       ? body
                : [];
    all.push(...items);
    const totalPages = body?.totalPages ?? 1;
    if (page >= totalPages || items.length === 0) break;
    page++;
  }
  return all;
}

async function fetchAll(token) {
  console.log('[fetch] Fetching all collections...');
  const [students, companies, drives, applications] = await Promise.all([
    fetchPaged('/students',    token).then(d => { console.log(`  students:     ${d.length}`); return d; }),
    fetchPaged('/companies',   token).then(d => { console.log(`  companies:    ${d.length}`); return d; }),
    fetchPaged('/drives',      token).then(d => { console.log(`  drives:       ${d.length}`); return d; }),
    fetchPaged('/applications',token).then(d => { console.log(`  applications: ${d.length}`); return d; }),
  ]);
  return { students, companies, drives, applications };
}

// ─── 3. VALIDATE ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStudent(s) {
  const e = [];
  if (!s.studentId)                                             e.push('missing studentId');
  if (!s.name     || !String(s.name).trim())                   e.push('missing name');
  if (!s.email    || !EMAIL_RE.test(String(s.email).trim()))   e.push('invalid email');
  if (!s.department)                                            e.push('missing department');
  const cgpa = parseFloat(s.cgpa);
  if (isNaN(cgpa) || cgpa < 0 || cgpa > 10)                   e.push(`invalid cgpa (${s.cgpa})`);
  return e;
}

function validateCompany(c) {
  const e = [];
  if (!c.companyId)                                            e.push('missing companyId');
  if (!c.name || !String(c.name).trim())                       e.push('missing name');
  if (c.package !== undefined && parseFloat(c.package) < 0)   e.push('negative package');
  const mc = parseFloat(c.minimumCgpa);
  if (!isNaN(mc) && (mc < 0 || mc > 10))                      e.push(`invalid minimumCgpa (${c.minimumCgpa})`);
  return e;
}

function validateDrive(d, companyMap) {
  const e = [];
  if (!d.driveId)                                              e.push('missing driveId');
  if (!d.title || !String(d.title).trim())                     e.push('missing title');
  const cKey = d.company?.companyId || d.company?.name || d.company;
  if (!companyMap.has(String(cKey)))                           e.push(`unknown company (${cKey})`);
  return e;
}

function validateApplication(a, studentMap, driveMap) {
  const e = [];
  if (!a.applicationId)                                        e.push('missing applicationId');
  const sKey = a.student?.studentId ?? a.student;
  const dKey = a.drive?.driveId     ?? a.drive;
  if (!studentMap.has(String(sKey)))                           e.push(`unknown student (${sKey})`);
  if (!driveMap.has(String(dKey)))                             e.push(`unknown drive (${dKey})`);
  return e;
}

// ─── 4. SANITIZE ─────────────────────────────────────────────────────────────

const str   = v => String(v ?? '').trim();
const num   = (v, d = 0) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function sanitizeStudent(s) {
  return {
    studentId:      str(s.studentId),
    name:           str(s.name),
    email:          str(s.email).toLowerCase(),
    department:     str(s.department).toUpperCase(),
    cgpa:           clamp(num(s.cgpa), 0, 10),
    skills:         Array.isArray(s.skills) ? s.skills.map(sk => str(sk)).filter(Boolean) : [],
    graduationYear: s.graduationYear ? parseInt(s.graduationYear) : undefined,
    phone:          str(s.phone),
    status:         ['active','inactive'].includes(s.status) ? s.status : 'active'
  };
}

function sanitizeCompany(c) {
  return {
    companyId:           str(c.companyId),
    name:                str(c.name),
    role:                str(c.role),
    package:             Math.max(0, num(c.package, 0)),
    eligibleDepartments: Array.isArray(c.eligibleDepartments)
                           ? c.eligibleDepartments.map(d => str(d).toUpperCase()).filter(Boolean) : [],
    minimumCgpa:         clamp(num(c.minimumCgpa, 0), 0, 10),
    driveDate:           c.driveDate ? new Date(c.driveDate) : undefined,
    status:              ['active','inactive','upcoming'].includes(c.status) ? c.status : 'active'
  };
}

function sanitizeDrive(d, companyMap) {
  const cKey = d.company?.companyId || d.company?.name || d.company;
  return {
    driveId:              str(d.driveId),
    company:              companyMap.get(String(cKey)),
    title:                str(d.title),
    mode:                 ['online','offline','hybrid'].includes(d.mode) ? d.mode : 'online',
    location:             str(d.location),
    registrationDeadline: d.registrationDeadline ? new Date(d.registrationDeadline) : undefined,
    rounds:               Array.isArray(d.rounds) ? d.rounds.map(r => str(r)).filter(Boolean) : [],
    status:               ['open','closed','completed','upcoming'].includes(d.status) ? d.status : 'open'
  };
}

function sanitizeApplication(a, studentMap, driveMap) {
  const sKey = a.student?.studentId ?? a.student;
  const dKey = a.drive?.driveId     ?? a.drive;
  return {
    applicationId: str(a.applicationId),
    student:       studentMap.get(String(sKey)),
    drive:         driveMap.get(String(dKey)),
    currentRound:  str(a.currentRound || 'Applied'),
    status:        ['applied','shortlisted','selected','rejected'].includes(a.status) ? a.status : 'applied',
    appliedAt:     a.appliedAt ? new Date(a.appliedAt) : new Date()
  };
}

// ─── 5. PERSIST ──────────────────────────────────────────────────────────────

async function persist(raw) {
  const stats = {
    students:     { total: raw.students.length,     valid: 0, invalid: 0, inserted: 0 },
    companies:    { total: raw.companies.length,    valid: 0, invalid: 0, inserted: 0 },
    drives:       { total: raw.drives.length,       valid: 0, invalid: 0, inserted: 0 },
    applications: { total: raw.applications.length, valid: 0, invalid: 0, inserted: 0 }
  };

  // Students
  await Student.deleteMany({});
  const goodStudents = raw.students.filter(s => {
    const errs = validateStudent(s);
    if (errs.length) { stats.students.invalid++; return false; }
    stats.students.valid++; return true;
  }).map(sanitizeStudent);
  if (goodStudents.length) {
    try { const r = await Student.insertMany(goodStudents, { ordered: false }); stats.students.inserted = r.length; }
    catch (e) { stats.students.inserted = goodStudents.length - (e.writeErrors?.length ?? 0); }
  }

  const studentMap = new Map((await Student.find({}, 'studentId _id').lean()).map(s => [s.studentId, s._id]));

  // Companies
  await Company.deleteMany({});
  const goodCompanies = raw.companies.filter(c => {
    const errs = validateCompany(c);
    if (errs.length) { stats.companies.invalid++; return false; }
    stats.companies.valid++; return true;
  }).map(sanitizeCompany);
  if (goodCompanies.length) {
    try { const r = await Company.insertMany(goodCompanies, { ordered: false }); stats.companies.inserted = r.length; }
    catch (e) { stats.companies.inserted = goodCompanies.length - (e.writeErrors?.length ?? 0); }
  }

  const companyMap = new Map();
  (await Company.find({}, 'companyId name _id').lean()).forEach(c => {
    companyMap.set(c.companyId, c._id); companyMap.set(c.name, c._id);
  });

  // Drives
  await Drive.deleteMany({});
  const goodDrives = raw.drives.filter(d => {
    const errs = validateDrive(d, companyMap);
    if (errs.length) { stats.drives.invalid++; return false; }
    stats.drives.valid++; return true;
  }).map(d => sanitizeDrive(d, companyMap));
  if (goodDrives.length) {
    try { const r = await Drive.insertMany(goodDrives, { ordered: false }); stats.drives.inserted = r.length; }
    catch (e) { stats.drives.inserted = goodDrives.length - (e.writeErrors?.length ?? 0); }
  }

  const driveMap = new Map((await Drive.find({}, 'driveId _id').lean()).map(d => [d.driveId, d._id]));

  // Applications
  await Application.deleteMany({});
  const goodApps = raw.applications.filter(a => {
    const errs = validateApplication(a, studentMap, driveMap);
    if (errs.length) { stats.applications.invalid++; return false; }
    stats.applications.valid++; return true;
  }).map(a => sanitizeApplication(a, studentMap, driveMap));
  if (goodApps.length) {
    try { const r = await Application.insertMany(goodApps, { ordered: false }); stats.applications.inserted = r.length; }
    catch (e) { stats.applications.inserted = goodApps.length - (e.writeErrors?.length ?? 0); }
  }

  return stats;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

/**
 * Full pipeline: auth → fetch → validate → sanitize → persist
 * @param {string} [manualToken] - skip auth, use this token directly
 */
async function syncDataset(manualToken) {
  let token;
  let raw;

  if (FORCE_LOCAL_DATASET) {
    console.warn('[dataset] Forcing local fallback dataset.');
    raw = loadFallbackDataset();
  } else if (manualToken) {
    token = manualToken;
  } else {
    try {
      token = await getAuthToken();
    } catch (err) {
      if (!ENABLE_LOCAL_FALLBACK) throw err;
      console.warn('[dataset] Remote authentication failed. Falling back to local dataset.');
      raw = loadFallbackDataset();
    }
  }

  if (!raw) {
    try {
      raw = await fetchAll(token);
    } catch (err) {
      if (!ENABLE_LOCAL_FALLBACK) throw err;
      console.warn('[dataset] Remote fetch failed. Falling back to local dataset.');
      raw = loadFallbackDataset();
    }
  }

  if (raw.students.length === 0 && raw.companies.length === 0) {
    if (ENABLE_LOCAL_FALLBACK) {
      console.warn('[dataset] Remote dataset was empty. Falling back to local dataset.');
      raw = loadFallbackDataset();
    } else {
      throw new Error('Test server returned empty dataset.');
    }
  }

  const stats = await persist(raw);
  return { stats, token };
}

module.exports = { syncDataset, getAuthToken, fetchAll };
