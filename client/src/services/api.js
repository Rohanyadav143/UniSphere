import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000
});

export function apiMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.message || fallback;
}

export default api;
