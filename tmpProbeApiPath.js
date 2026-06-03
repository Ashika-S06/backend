const axios = require('axios');
const paths = [
  'https://t4e-testserver.onrender.com/api/auth/login',
  'https://t4e-testserver.onrender.com/auth/login',
  'https://t4e-testserver.onrender.com/api/v1/auth/login',
  'https://t4e-testserver.onrender.com/v1/auth/login'
];
(async () => {
  for (const url of paths) {
    try {
      const res = await axios.post(url, { email: 'e0123019@sriher.edu.in', password: '910131' }, { timeout: 20000 });
      console.log(url, JSON.stringify(res.data));
    } catch (e) {
      if (e.response) {
        console.log(url, 'STATUS', e.response.status, JSON.stringify(e.response.data));
      } else {
        console.log(url, 'ERR', e.message);
      }
    }
  }
})();
