import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
    const token = jwt.sign(
        { userId }, 
        process.env.JWT_SECRET, 
        {
            expiresIn: '15d'
        }
    );

    res.cookie("access_token", token, {
        httpOnly: true,
        secure: !Boolean(process.env.DEBUG),
        sameSite: "strict",
        maxAge: 15 * 24 * 60 * 60 * 1000
    });
};

export default generateToken;