import axios from 'axios';

// Browser requests go through the Next.js proxy so the backend password stays server-side.
const baseURL = '/api/backend';

const api = axios.create({
  baseURL,
  timeout: 30000,
});

export default api;
