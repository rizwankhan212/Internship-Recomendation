import express from "express"
import wrapAsync from "../utils/wrapAsync.js";
import { signup,login,logout } from '../controllers/user.js';

const router = express.Router();


router.route('/signup')
    .post(wrapAsync(signup))

router.post('/login',login);

router.post('/logout',logout);
export default router;