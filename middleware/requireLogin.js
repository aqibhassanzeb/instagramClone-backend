const express =require('express')
const jwt= require('jsonwebtoken')
const mongoose=require('mongoose')
const JWT__SECRET=require('../key')
const User=mongoose.model("User")

module.exports=(req,res,next)=>{
    const {authorization}=req.headers
    if(!authorization){
      return  res.status(401).json({error:"you must be logged in"})
    }
    const token=authorization.replace("Bearer ","")
    jwt.verify(token,JWT__SECRET,(err,payload)=>{
        if(err){
            return res.status(401).json({error:"you must be logged in"})
        }
        const {_id}=payload
        // console.log({payload})
        
        User.findOne(payload).then(userdata=>{
        //    console.log(payload)
           req.user=userdata
        //    console.log(req.user)
        next();  
        })
    })
}