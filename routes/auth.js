const express = require('express')
const { default: mongoose } = require('mongoose')
const router = express.Router()
const User = mongoose.model("User")
const bycrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const JWT__SECRET = require('../key')
const requireLogin = require('../middleware/requireLogin')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const { OAuth2Client } = require('google-auth-library')

const client = new OAuth2Client("1021784210660-04ov682sojbq371pj4nle67s5c5ljuav.apps.googleusercontent.com")
// console.log(client)
// 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  this is sendgrid link


const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: "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"
    }
}))

router.get('/protect', requireLogin, (req, res) => {
    res.send('this is protected')
})

router.post('/signup', (req, res) => {
    const { name, email, password, pic } = req.body
    if (!name || !email || !password) {
        return res.status(422).json({ error: "please fill all field " })
    }
    User.findOne({ email: email })
        .then((saveUser) => {
            if (saveUser) {
                return res.status(422).json({ error: "Already register this email" })
            }
            bycrypt.hash(password, 12)
                .then((hashedpassword) => {

                    const user = new User({
                        email,
                        password: hashedpassword,
                        name,
                        pic
                    })
                    user.save()
                        .then(user => {
                            transporter.sendMail({
                                to: user.email,
                                from: "aqibhassanzeb@gmail.com",
                                subject: "signup success",
                                html: "<h1>welcome to instagramprac</h1>"
                            }).then((response) => {
                                console.log(response)
                            })
                                .catch((error) => {
                                    console.error(error)
                                })
                            res.json({ message: "register successfully" })
                        }).catch((err) => {
                            console.log(err)
                        })
                })
        }).catch((err) => {
            console.log(err)
        })

})

router.post('/signin', (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(422).json({ error: "please add email or password" })
    }
    User.findOne({ email: email })
        .then((savedUser) => {
            if (!savedUser) {
                return res.status(422).json({ error: "invalid email " })
            }
            bycrypt.compare(password, savedUser.password)
                .then(doMatch => {
                    if (doMatch) {
                        // res.json({message:"successfully signin"})
                        const token = jwt.sign({ _id: savedUser._id }, JWT__SECRET)
                        const { _id, name, email, pic } = savedUser
                        res.json({ token, user: { _id, name, email, pic } })
                    } else {
                        return res.status(422).json({ error: 'invalid password' })
                    }
                })
        })
        .catch(err => {
            console.log(err)
        })
})

router.post('/reset-password', (req, res) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err)
        }
        const token = buffer.toString("hex")
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    return res.status(422).json({ error: "User dont exists with that email" })
                }
                user.resetToken = token
                user.expireToken = Date.now() + 3600000
                // console.log("expire token",user.expireToken)
                user.save().then((result) => {
                    transporter.sendMail({
                        to: user.email,
                        from: "aqibhassanzeb@gmail.com",
                        subject: "password reset",
                        html: `
                    <p>You requested for password reset</p>
                    <h5>click in this <a href="http://localhost:3000/reset/${token}">link</a> to reset password</h5>
                    `
                    })
                    res.json({ message: "check your email" })
                })

            })
    })
})

router.post('/new-password', (req, res) => {
    const newPassword = req.body.password
    const sentToken = req.body.token
    // console.log('senttoken ',sentToken)
    // console.log('new password',newPassword)
    User.findOne({ resetToken: sentToken, expireToken: { $gt: Date.now() } })

        .then(user => {
            // console.log("user",user)
            if (!user) {
                return res.status(422).json({ error: "Try again session expired" })
            }
            bycrypt.hash(newPassword, 12).then(hashedpassword => {
                user.password = hashedpassword
                user.resetToken = undefined
                user.expireToken = undefined
                user.save().then((saveduser) => {
                    res.json({ message: "password updated success" })
                })
            })
        }).catch(err => {
            console.log(err)
        })
})

router.post('/signinwithg', (req, res) => {
    const { tokenId } = req.body;


    client.verifyIdToken({ idToken: tokenId, audience: '1021784210660-04ov682sojbq371pj4nle67s5c5ljuav.apps.googleusercontent.com' }).then(result => {
        const { email_verified, name, email, picture } = result.payload;
        if (email_verified) {
            User.findOne({ email }).exec((err, user) => {
                if (err) {
                    return res.status(422).json({ error: "some thing went wrong.." })
                } else {
                    if (user) {
                        const token = jwt.sign({ _id: user._id }, JWT__SECRET)
                        const { _id, name, email, pic } = user
                        res.json({ token, user: { _id, name, email, pic } })
                    } else {
                        let password = email + JWT__SECRET
                        bycrypt.hash(password, 12)
                            .then(hashedpassword => {
                                const newuser = new User({
                                    email,
                                    password: hashedpassword,
                                    name,
                                    pic: picture
                                })

                                newuser.save((err, data) => {
                                    if (err) {
                                        return res.status(422).json({ error: "some thing wrong in registration..." })
                                    } else {
                                        const token = jwt.sign({ _id: data._id }, JWT__SECRET)
                                        const { _id, name, email, pic } = newuser
                                        res.json({ token, user: { _id, name, email, pic } })

                                        transporter.sendMail({
                                            to: data.email,
                                            from: "aqibhassanzeb@gmail.com",
                                            subject: "signup success",
                                            html: "<h1>welcome to instagramprac</h1>"
                                        }).then(res => console.log(res)).catch(err => console.log(err))


                                    }
                                })
                            })
                    }
                }
            })
        }

    })

    //   verify = async(tokenId)=> {
    //     const ticket = await client.verifyIdToken({
    //      idToken: tokenId,
    //      audience:"1021784210660-04ov682sojbq371pj4nle67s5c5ljuav.apps.googleusercontent.com"
    //     })
    //     const payload = ticket.getPayload()
    //     return payload
    //     console.log(payload)
    //     }
    // verify();


})

module.exports = router