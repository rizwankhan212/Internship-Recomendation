import User from "../models/user.js";
import passport from "passport";

export const signup = async (req, res, next) => {
    try {
        const { email, role, password } = req.body;

        const user = new User({ email, role });

        const registeredUser = await User.register(user, password);

        req.login(registeredUser, (err) => {
            if (err) return next(err);

            return res.status(201).json({
                message: "User registered successfully",
                user: registeredUser
            });
        });

    } catch (error) {
        if (error.name === "UserExistsError") {
            return res.status(400).json({
                message: "User already exists with this email"
            });
        }

        return res.status(500).json({
            message: "Signup failed",
            error: error.message
        });
    }
};
export const login = (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);

        if (!user) {
            return res.status(400).json({
                message: info?.message || info?.toString() || "Invalid email or password"
            });
        }

        req.login(user, (err) => {
            if (err) return next(err);

            return res.status(200).json({
                message: "Login successful",
                user
            });
        });

    })(req, res, next);
};

export const logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);

        req.session.destroy(() => {
            res.clearCookie("connect.sid");

            return res.status(200).json({
                message: "Logout successful"
            });
        });
    });
};