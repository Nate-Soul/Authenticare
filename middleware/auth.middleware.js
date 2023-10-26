import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";

export const verifyToken = asyncHandler(async (req, res, next) => {    
    const access_token = req.cookies.access_token;
    if (access_token) {
        try {
            const decoded = jwt.verify(access_token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.userId).select('-password');
            next();
        } catch (error) {
            res.status(403);
            throw new Error("Invalid token!");
        }
    } else {
        res.status(401);
        throw new Error("You're not authorized, no token");
    }
});

export const isOwnerorAdminPermission = asyncHandler(async (req, res, next) => {
    if(req.user && req.params.id == req.user._id){
        next();
    } else {
        res.status(403);
        throw new Error("You must be the owner to access this");
    }
});