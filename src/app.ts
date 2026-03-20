import express from "express"
import cors from "cors"
import helmet from "helmet"

const app = express()

app.use(express.json())
app.use(cors())
app.use(helmet())

app.get('/',(req,res) => {
    res.status(200).json({
        success: true,
        message: "Backend is online"
    })
})

export default app