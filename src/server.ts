import app from './app'

const PORT = 5000

app.get('/',(req,res) => {
    res.status(200).json({
        success: true,
        message: "Backend is online"
    })
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})