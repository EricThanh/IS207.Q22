import { axiosClient } from "./axiosClient";

export const orderApi = {
  create(payload) {
    return axiosClient.post("/api/orders", payload);
  },
  getMyOrders() {
    return axiosClient.get("/api/orders/my");
  },
};
