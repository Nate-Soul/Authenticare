import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";

const development = Boolean(process.env.DEBUG);

export const register = asyncHandler(async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    const userExists = await User.findOne({email});
    if(userExists){
        res.status(400);
        throw new Error("User already exists");
    }

    const user = await User.create({
        first_name,
        last_name,
        email,
        password,
    });

    if(user){
        generateToken(res, user._id);
        res.status(201).json({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });
        if (development === true){
            console.log(`${req.method}: ${res.statusCode} | New user created`);
        }
    } else {
        res.status(400);
        throw new Error("Invalid User Profile");
    }
}); 

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if(user && (await user.matchPassword(password))){
        generateToken(res, user._id);
        res.status(200).json({
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
        });
    } else {
        res.status(401);
        throw new Error("Invalid Email / Password");
    }
});
    
export const logout = asyncHandler(async (req, res) => {
    res.cookie("access_token", "", {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(204).json({'message': 'You\'ve been logged out of the multi galaxies of madness' });
}); 