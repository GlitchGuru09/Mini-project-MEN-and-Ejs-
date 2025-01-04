const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const userModel = require("./models/user");
const postModel = require("./models/post");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const port = 3000;

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());


app.get('/',function(req,res){
    res.render("index");
})

//show profile page
app.get('/profile',isLoggedIn,function(req,res){
    console.log(req.user);
    res.render("login");

})

//register
app.post('/register', async function(req,res){
    let {username, name, email, age, password} = req.body;
     
    let user = await  userModel.findOne({email});
    if(user) return res.status(500).send("user already registered.");

    bcrypt.genSalt(10, function(err, salt){
        bcrypt.hash(password, salt, async function(err, hash){
            let user = await userModel.create({
                username,
                name,
                email,
                age,
                password: hash
            })
            
            const token = jwt.sign({email: email, userid: user.id}, "secret");
            res.cookie("token", token);
            res.send("Registered");

        })
    })
})

//show login page
app.get('/login',function(req,res){
    res.render("login");
})

//login
app.post('/login', async function(req,res){
    let {email, password} = req.body;
     
    let user = await  userModel.findOne({email});
    if(!user) return res.status(500).send("Something went wrong!");

    bcrypt.compare(password, user.password, function(err, result){
        if(result){
            const token = jwt.sign({email: email, userid: user.id}, "secret");
            res.cookie("token", token);
            res.status(200).send("you can login.");
        }
        else res.redirect("/login");
    })
})

//logout
app.get('/logout',function(req,res){
    res.cookie("token","");
    res.redirect("/login");
})

//protected routes (it acts as a middle ware)
function isLoggedIn(req,res,next){
    if(req.cookies.token === "") res.send("You must be logged in to access this page.");
    else{
        let data = jwt.verify(req.cookies.token, "secret");
        req.user = data
        next();
    }
    
}


app.listen(port, function(err){
    if(err){
        console.log('Something went wrong!');
    }else{
        console.log(`Server running on port: ${port}`);
    }
})