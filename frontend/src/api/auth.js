import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8080",
  withCredentials: true // 🔥 important for sessions
});

// signup
export const signupUser = (data) => API.post("/signup", data);

// login
export const loginUser = (data) => API.post("/login", data);

// logout
export const logoutUser = () => API.post("/logout");

// check current user
export const getCurrentUser = () => API.get("/me");