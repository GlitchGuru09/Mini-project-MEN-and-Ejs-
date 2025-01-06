const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const userModel = require("./models/user");
const postModel = require("./models/post");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const upload = require("./configs/multerconfig");
const path = require('path'); 

const port = 3000;

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));


//show create account page 
app.get('/',function(req,res){
    res.render("index");
})

//profile upload page
app.get('/profile/upload',function(req,res){
    res.render("profileupload");
})

app.post('/upload',isLoggedIn, upload.single("image"),async function(req,res){
    // console.log(req.file);
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
})
//show profile page
app.get('/profile',isLoggedIn,async function(req,res){
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    res.render("profile",{user});

})

//like feature
app.get('/like/:id',isLoggedIn,async function(req,res){
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);//if there is no like then push one like
    }else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);//if there is like then remove one like
    }

    await post.save();
    res.redirect("/profile");

})

//show edit page
app.get('/edit/:id',isLoggedIn,async function(req,res){
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    res.render("edit",{post})

})

//edit feature
app.post('/update/:id', isLoggedIn, async function(req, res) {
      let post = await postModel.findOneAndUpdate({ _id: req.params.id },{ content: req.body.content });
      res.redirect('/profile');
});
  

//create post 
app.post('/post',isLoggedIn ,async function(req,res){
    let user = await userModel.findOne({email: req.user.email})
    let {content} = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    })

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");

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
            res.redirect("/login");

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
            res.status(200).redirect("/profile");
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
    if(req.cookies.token === "") res.redirect("/login");
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