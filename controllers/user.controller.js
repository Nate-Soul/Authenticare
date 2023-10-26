import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";

// @desc Get all user profiles
// @route GET /api/users
// @access public
const getUsers = asyncHandler(async (req, res) => {
    const users = await User.find();
    res.status(200).json(users);
});

// @desc Get user profile by username or some other unique parameter
// @route GET /api/users/<unique_param>
// @access private
const getUser = asyncHandler(async (req, res) => {
    const user = {
        _id: req.user._id,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        email: req.user.email
    }

    res.status(200).json(user);
});


// @desc Update user profile by username or some other unique parameter
// @route PUT /api/users/<unique_param>
// @access private
const updateUser = asyncHandler(async (req, res) => {

    try{
        const user = await User.findById(req.user._id);
        if (user){
            user.first_name = req.body.first_name || user.first_name;
            user.last_name  = req.body.last_name || user.last_name;
            user.email      = req.body.email || user.email;

            if(req.body.password){
                user.password = req.body.password;
            }
            
            const updatedUser = await user.save();
            res.status(200).json({
                _id: updatedUser._id,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                email: updatedUser.email
            });
        } else {
            res.status(404);
            throw new Error("User credentials not found");
        }
    } catch (error) {
        res.status(400);
        throw new Error("An error occured");
    }
});


// @desc Update user profile by username or some other unique parameter
// @route DELETE /api/users/<unique_param>
// @access private
const deleteUser = asyncHandler(async (req, res) => {
    try{
        const user = await User.findById(req.user._id);
        if(user){
            await User.deleteOne({ _id: user._id });
            res.status(200).json({'detail': user.name + ' has been deleted'});
        } else {
            res.status(404);
            throw new Error("User credentials not found");
        }
    } catch (error) {
        res.status(400);
        throw new Error("Something went wrong");
    }
});

export {
    getUsers,
    getUser,
    updateUser,
    deleteUser
}