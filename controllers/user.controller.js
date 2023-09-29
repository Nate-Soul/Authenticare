import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";

// @desc Get all user profiles
// @route GET /api/users
// @access public
const getUsers = asyncHandler(async (req, res) => {
    res.status(200).json({'detail': 'Fetched all active user profiles'});
});

// @desc Get user profile by username or some other unique parameter
// @route GET /api/users/<unique_param>
// @access private
const getUser = asyncHandler(async (req, res) => {
    const user = {
        _id: req.user._id,
        name: req.user.name,
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
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
    
            if(req.body.password){
                user.password = req.body.password
            }
    
            const updatedUser = await user.save();
            res.status(200).json({
                _id: updatedUser._id,
                name: updatedUser.name,
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