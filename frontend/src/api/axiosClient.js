import axios from "axios";

export const axiosClient = axios.create({
  baseURL: "http://localhost/flower-shop-api/public/index.php",
  timeout: 10000,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("flower_shop_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});