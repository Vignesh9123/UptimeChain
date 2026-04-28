import nodemailer from "nodemailer"
import { config } from 'dotenv'
config()
export const sendEmail = async (options:{
    email: string,
    subject: string,
    message: string
}) => {
    var transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        service: 'gmail',
        port: 587,
        secure: false,
        auth: {
            user: process.env.SENDER_EMAIL,
            pass: process.env.MAIL_APP_PASSWORD
        }
    });

    const mailOptions = {
        from: {
            name: 'Streamforge',
            address: process.env.SENDER_EMAIL!
        },
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    await transporter.sendMail(mailOptions);
}