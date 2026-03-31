import dotenv from 'dotenv'
if(process.env.NODE_ENV !== "production"){
    dotenv.config();
}
import express from 'express';
import cors from "cors";
import mongoose from "mongoose"; // ✅ added
import candidateRouter from './routes/candidate.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import pkg from 'passport-local'; // ✅ fixed
import User from './models/user.js';
import userRouter from './routes/user.js';
import ExpressError from './utils/ExpressError.js'

const LocalStrategy = pkg.Strategy; // ✅ fixed

const app = express();
app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173",
     credentials: true
}));

const db_url = process.env.ATLAS_DB_URL;

main()
.then(()=> console.log("Connected to Database"))
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(db_url);
}

app.listen(8080,()=>{
    console.log('app is listening on 8080');
});

// ✅ fixed (removed new)
const store = MongoStore.create({
    mongoUrl: db_url,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 3600
});

store.on("error",(e)=>{
    console.log("Mongo Store Error:",e);
});

const sessionOption = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false, // ✅ improved
    cookie: {
        expires: Date.now()+7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
        sameSite: "lax",   // ✅ IMPORTANT
        secure: false     
    }
};

app.use(session(sessionOption));

// passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({ usernameField: "email" }, User.authenticate())); 
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentPath = req.path; // ye current URL path dega
    next();
});

// routes
app.use('/candidate', candidateRouter);
app.use('/', userRouter);

app.get("/me", (req, res) => {
    res.json({
        user: req.user || null
    });
});

app.use( (req,res,next) =>{
    next(new ExpressError(404,"Page not found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;

    res.status(statusCode).json({
        success: false,
        message
    });
});
