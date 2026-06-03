const axios = require('axios');
const combos = [
  { email: 'uniqueid@sriher.edu.in', password: '910131' },
  { email: 'UniqueID@sriher.edu.in', password: '910131' },
  { email: 'UniqueID', password: '910131' },
  { studentId: 'UniqueID', password: '910131' },
  { uniqueId: 'UniqueID', password: '910131' },
  { username: 'UniqueID', password: '910131' },
  { id: 'UniqueID', password: '910131' },
  { rollNo: 'UniqueID', password: '910131' },
  { rollNumber: 'UniqueID', password: '910131' },
  { email: 'uniqueid@sriher.edu.in', password: 'UniqueID' },
  { studentId: 'UniqueID', password: 'UniqueID' },
  { email: 'uniqueid@sriher.edu.in', password: '910131', name: 'ASHIKA S' }
];
(async () => {
  for (const body of combos) {
    try {
      const res = await axios.post('https://t4e-testserver.onrender.com/api/auth/login', body, { timeout: 20000 });
      console.log('LOGIN OK', JSON.stringify(body), '=>', JSON.stringify(res.data));
    } catch (err) {
      if (err.response) {
        console.log('LOGIN ERR', JSON.stringify(body), err.response.status, JSON.stringify(err.response.data));
      } else {
        console.log('LOGIN ERR', JSON.stringify(body), err.message);
      }
    }
  }
  try {
    const reg = await axios.post('https://t4e-testserver.onrender.com/api/auth/register', { email: 'uniqueid@sriher.edu.in', password: '910131', name: 'ASHIKA S' }, { timeout: 20000 });
    console.log('REGISTER', JSON.stringify(reg.data));
  } catch (err) {
    if (err.response) {
      console.log('REGISTER ERR', err.response.status, JSON.stringify(err.response.data));
    } else {
      console.log('REGISTER ERR', err.message);
    }
  }
})();
