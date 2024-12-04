const inProduction = process.env.NODE_ENV === 'production';

export const API_URL = inProduction ? 'https://sba-n63p.onrender.com:5001/api' : 'http://localhost:5001/api';