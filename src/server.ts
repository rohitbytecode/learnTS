import 'dotenv/config';
import http from 'http';
import app from './app'
import { prisma } from './config/db';

const PORT = process.env.PORT || 5000;

app.get('/',(req,res) => {
    res.status(200).json({
        success: true,
        message: "Backend is online"
    })
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})