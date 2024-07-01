import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import { createError } from "../error.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from 'dotenv';
import otpGenerator from 'otp-generator';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    },
    port: 465,
    host: 'smtp.gmail.com'
});

export const signup = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return res.status(422).send({ message: "Missing email." });
    }

    try {
        const existingUser = await User.findOne({ email }).exec();
        if (existingUser) {
            return res.status(409).send({ message: "Email is already in use." });
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(req.body.password, salt);
        const newUser = new User({ ...req.body, password: hashedPassword });

        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, process.env.JWT, { expiresIn: "9999 years" });
        res.status(200).json({ token, user: newUser });
    } catch (err) {
        next(err); // Pass error to error handling middleware
    }
};

export const signin = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return next(createError(404, "User not found"));
        }

        if (user.googleSignIn) {
            return next(createError(401, "User signed up with Google. Please sign in with Google."));
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);

        if (!validPassword) {
            return next(createError(401, "Wrong password"));
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT, { expiresIn: "9999 years" });
        res.status(200).json({ token, user });
    } catch (err) {
        next(err); // Pass error to error handling middleware
    }
};

export const googleAuthSignIn = async (req, res, next) => {
    try {
        let user = await User.findOne({ email: req.body.email });

        if (!user) {
            user = new User({ ...req.body, googleSignIn: true });
            await user.save();
        } else if (!user.googleSignIn) {
            return next(createError(409, "User already exists with this email and cannot use Google authentication."));
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT, { expiresIn: "9999 years" });
        res.status(200).json({ token, user });
    } catch (err) {
        next(err); // Pass error to error handling middleware
    }
};

export const logout = (req, res) => {
    res.clearCookie("access_token").json({ message: "Logged out" });
};

export const generateOTP = async (req, res, next) => {
    try {
        const otp = otpGenerator.generate(6, { digits: true });
console.log(otp)
        req.app.locals.OTP = otp;

        const { email, name, reason } = req.query;

        const mailOptions = {
            to: email,
            subject: reason === "FORGOTPASSWORD" ? 'PODSTREAM Reset Password Verification' : 'Account Verification OTP',
            html: reason === "FORGOTPASSWORD" ? generateResetPasswordEmail(name, otp) : generateVerificationEmail(name, otp)
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                return next(err);
            }
            res.status(200).send({ message: "OTP sent" });
        });
    } catch (err) {
        next(err); // Pass error to error handling middleware
    }
};

export const verifyOTP = async (req, res, next) => {
    const { code } = req.query;
    console.log(code)
    console.log(req.app.locals.OTP)

    if (code === req.app.locals.OTP) {
        req.app.locals.OTP = null;
        req.app.locals.resetSession = true;
        return res.status(200).send({ message: "OTP verified" });
    }

    return next(createError(401, "Wrong OTP"));
};

export const createResetSession = (req, res) => {
    if (req.app.locals.resetSession) {
        req.app.locals.resetSession = false;
        return res.status(200).send({ message: "Access granted" });
    }

    return res.status(400).send({ message: "Session expired" });
};

export const findUserByEmail = async (req, res, next) => {
    const { email } = req.query;

    try {
        const user = await User.findOne({ email });
        if (user) {
            return res.status(200).send({ message: "User found" });
        }
        return res.status(404).send({ message: "User not found" });
    } catch (err) {
        next(err); // Pass error to error handling middleware
    }
};

export const resetPassword = async (req, res, next) => {
    if (!req.app.locals.resetSession) {
        return res.status(440).send({ message: "Session expired" });
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        await User.updateOne({ email }, { $set: { password: hashedPassword } });

        req.app.locals.resetSession = false;
        return res.status(200).send({ message: "Password reset successful" });
    } catch (err) {
        next(err); // Pass error to error handling middleware
    }
};


function generateVerificationEmail(name, otp) {
    return `
        <div style="font-family: Poppins, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border: 1px solid #ccc; border-radius: 5px;">
            <h1 style="font-size: 22px; font-weight: 500; color: #854CE6; text-align: center; margin-bottom: 30px;">Verify Your PODSTREAM Account</h1>
            <div style="background-color: #FFF; border: 1px solid #e5e5e5; border-radius: 5px; box-shadow: 0px 3px 6px rgba(0,0,0,0.05);">
                <div style="background-color: #854CE6; border-top-left-radius: 5px; border-top-right-radius: 5px; padding: 20px 0;">
                    <h2 style="font-size: 28px; font-weight: 500; color: #FFF; text-align: center; margin-bottom: 10px;">Verification Code</h2>
                    <h1 style="font-size: 32px; font-weight: 500; color: #FFF; text-align: center; margin-bottom: 20px;">${otp}</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Dear ${name},</p>
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Thank you for creating a PODSTREAM account. To activate your account, please enter the following verification code:</p>
                    <p style="font-size: 20px; font-weight: 500; color: #666; text-align: center; margin-bottom: 30px; color: #854CE6;">${otp}</p>
                    <p style="font-size: 12px; color: #666; margin-bottom: 20px;">Please enter this code in the PODSTREAM app to activate your account.</p>
                    <p style="font-size: 12px; color: #666; margin-bottom: 20px;">If you did not create a PODSTREAM account, please disregard this email.</p>
                </div>
            </div>
        </div>`;
}