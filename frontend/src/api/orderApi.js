import { axiosClient } from "./axiosClient";

export const orderApi = {
  create(payload) {
    return axiosClient.post("/api/orders", payload);
  },
  getMyOrders() {
    return axiosClient.get("/api/orders/my");
  },
  getSellerOrders() {
    return axiosClient.get("/api/seller/orders");
  },
  confirmSellerOrder(orderId) {
    return axiosClient.put(`/api/seller/orders/${orderId}/confirm`);
  },
  updateSellerOrderStatus(orderId, status) {
    return axiosClient.patch(`/api/seller/orders/${orderId}/status`, { status });
  },
};
