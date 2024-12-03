const inProduction = process.env.NODE_ENV === 'production';

export const API_URL = inProduction ? 'TBD' : 'http://localhost:5001/api';