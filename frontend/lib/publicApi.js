import axios from "axios";
import { DEFAULT_TIMEOUT_MS } from "./api";

const publicApi = axios.create({
  baseURL: "/api/calculate",
  timeout: DEFAULT_TIMEOUT_MS,
});

export default publicApi;
