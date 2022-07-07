const express =require('express')
const app=express()
var cors = require('cors')
const mongoose=require('mongoose')
require('./key')
app.use(cors())
const PORT=5000;

// iVAbItPe7IvypyxF
require('./models/user')
require('./models/post')

app.use(express.json())



app.use(require('./routes/auth'))
app.use(require('./routes/post'))
app.use(require('./routes/user'))


app.listen(PORT,()=>{
    console.log('The server is runnig is on ',PORT)
})