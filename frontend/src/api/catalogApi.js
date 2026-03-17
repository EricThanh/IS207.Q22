import { axiosClient } from "./axiosClient";

export const catalogApi = {
  getCategories() {
    return axiosClient.get("/api/categories");
  },
  getProducts(params = {}) {
    // params: { search, category_id }
    return axiosClient.get("/api/products", { params });
  },
};