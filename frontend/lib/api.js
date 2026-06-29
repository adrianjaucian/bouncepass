import axios from "axios";

const baseURL = "/api/backend";

export const DEFAULT_TIMEOUT_MS = 120000;
export const SYNC_TIMEOUT_MS = 15 * 60 * 1000;

function createApi(timeout) {
  return axios.create({
    baseURL,
    timeout,
  });
}

const api = createApi(DEFAULT_TIMEOUT_MS);
export const syncApi = createApi(SYNC_TIMEOUT_MS);

export default api;
