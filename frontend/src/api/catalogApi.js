import { axiosClient } from "./axiosClient";

export const catalogApi = {
  getCategories() {
    return axiosClient.get("/api/categories");
  },
  getProducts(params = {}) {
    // params: { search, category_id, min_price, max_price }
    return axiosClient.get("/api/products", { params });
  },
  getReviews(productId) {
    return axiosClient.get(`/api/products/${productId}/reviews`);
  },
  submitReview({ product_id, order_id, rating, comment }) {
    return axiosClient.post("/api/reviews", { product_id, order_id, rating, comment });
  },
};
