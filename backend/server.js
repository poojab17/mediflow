import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { clerkMiddleware } from '@clerk/express'
import { connectDB } from './config/db.js';
import "./config/redis.js";
import ragRoutes from "./routes/ragRoutes.js";
import doctorRouter from './routes/doctorRouter.js';
import serviceRouter from './routes/serviceRouter.js';
import appointmentRouter from './routes/appointmentRouter.js';
import serviceAppointmentRouter from './routes/serviceAppointmentRouter.js';
import newsletterRoutes from "./routes/newsletterRoutes.js";
import chatbotRouter from "./routes/chatbotRouter.js";
import testRoutes from "./routes/testRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";






const app = express();
const port = 4000;

const allowedOrigins = [
    "http://localhost:5173",
   "http://localhost:5174",
   "http://127.0.0.1:5174",
];


//Middleware
app.use(cors(
    {
        origin: function (origin, callback) {

            console.log("Incoming Origin:", origin); 

            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                console.log("Allowed Origin:", origin); 
                return callback(null, true);
            }

            console.log("Blocked Origin:", origin); 

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }
));
app.use(clerkMiddleware());
app.use(express.json({ limit: "20mb"}));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

//DB
connectDB();


//Routes
app.use("/api/doctors", doctorRouter);
app.use("/api/services", serviceRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/service-appointments", serviceAppointmentRouter);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/chatbot", chatbotRouter);
app.use("/api/test", testRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/rag", ragRoutes);


app.get('/', (req, res) => {
    res.send("API WORKING");
});

app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
})