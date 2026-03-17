import axios from "axios";

export const axiosClient = axios.create({
  baseURL: "http://localhost/flower-shop-api/public/index.php",
  timeout: 10000,
});