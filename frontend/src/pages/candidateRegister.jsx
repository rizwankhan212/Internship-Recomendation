import React, { useState } from "react";
import axios from "axios";

export default function CandidateRegister() {
    const [form, setForm] = useState({
        username: "",
        password: "",
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRegister = async () => {
        try {
            const res = await axios.post(
                "http://localhost:8080/candidate/register",
                form
            );
            alert("success");
        } catch (err) {
            console.log(err); // 👈 ADD THIS
            console.log(err.response); // 👈 AND THIS
            alert(err.response?.data?.message || "Error");
        }
    };

    return (
        <div>
            <h2>Register</h2>

            <input
                type="text"
                name="username"
                placeholder="Enter username"
                onChange={handleChange}
            />

            <input
                type="password"
                name="password"
                placeholder="Enter password"
                onChange={handleChange}
            />

            <button onClick={handleRegister}>Register</button>
        </div>
    );
}