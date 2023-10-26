//App initialization
import express from "express";
const app  = express();
//import and load environment & Connect to port
import dotenv from "dotenv";
dotenv.config();
const port = process.env.PORT || 5000;
//server essentials
import cors from "cors";
import cookieParser from "cookie-parser";
//routes
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
//extras
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import { connectDB } from "./models/db.js";


app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);


app.use(notFound);
app.use(errorHandler);

app.listen(port, (res, req) => {
    connectDB();
    console.log(`Server is runnning on port ${port}`);
});