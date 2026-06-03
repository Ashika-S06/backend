const { getAuthToken, fetchAll } = require('./src/services/dataset.service');

(async () => {
  try {
    const token = await getAuthToken();
    console.log('TOKEN', token);
    const raw = await fetchAll(token);
    console.log('STATS', JSON.stringify({ students: raw.students.length, companies: raw.companies.length, drives: raw.drives.length, applications: raw.applications.length }, null, 2));
    console.log('FIRST_STUDENT', JSON.stringify(raw.students[0], null, 2));
    console.log('FIRST_COMPANY', JSON.stringify(raw.companies[0], null, 2));
    console.log('FIRST_DRIVE', JSON.stringify(raw.drives[0], null, 2));
    console.log('FIRST_APPLICATION', JSON.stringify(raw.applications[0], null, 2));
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  }
})();
