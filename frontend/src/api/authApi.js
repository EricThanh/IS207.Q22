import { axiosClient } from "./axiosClient";

export const authApi = {
  register(payload) {
    return axiosClient.post("/api/auth/register", payload);
  },
  login(payload) {
    return axiosClient.post("/api/auth/login", payload);
  },
  me() {
    return axiosClient.get("/api/auth/me");
  },
};