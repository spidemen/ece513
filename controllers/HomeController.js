const express = require("express");
const url = require('url');
var Device = require("../models/UVFit").Device;
var Activities = require("../models/UVFit").Activities;
var User = require("../models/UVFit").User;
var token=require("../models/UVFit").token;
var bcrypt = require("bcrypt-nodejs");
var jwt = require("jwt-simple");
var nodemailer = require('nodemailer');
var crypto = require('crypto');
const router = express.Router();

var secret ="klaglhjji34;wl5j35";
var secret1 ="klaglsfsfhjji34;wl5j35";
//Main page
router.get("/", (req, res)=> {
    res.render("home");
})
router.get("/create", (req, res)=> { 
    res.render("register");
})
router.get("/profile", (req, res)=> {
  
    res.render("profile");
})
router.get("/login", (req, res)=> {
  
    res.render("login");
});
router.get("/singleview", (req, res)=> {
  
    res.render("singleview");
});

// Function to generate a random apikey consisting of 32 characters
function getNewApikey() {
    var newApikey = "";
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
    for (var i = 0; i < 32; i++) {
       newApikey += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return newApikey;
}


router.get("/account/user", (req, res)=> {

    console.log("enter ajax accout get user infor");
      // Check for authentication token in x-auth header
  if (!req.headers["x-auth"]) {
      return res.status(401).json({success: false, message: "No authentication token"});
   }
   
   var authToken = req.headers["x-auth"];
   try {
      var decodedToken = jwt.decode(authToken, secret);
      var userStatus = {};
       User.findOne({email: decodedToken.email}, function(err, user) {
         if(err) {
            return res.status(200).json({success: false, message: "User does not exist."});
         }
         else {
            userStatus['success'] = true;
            userStatus['email'] = user.email;
            userStatus['fullName'] = user.fullName;
            userStatus['lastAccess'] = user.lastAccess;
            
            // Find devices based on decoded token
          Device.find({ userEmail : decodedToken.email}, function(err, devices) {
            if (!err) {
               // Construct device list
               var deviceList = []; 
               for (device of devices) {
                 deviceList.push({ 
                       deviceId: device.deviceId,
                       apikey: device.apikey,
                 });
               }
               userStatus['devices'] = deviceList;
            }
            
               return res.status(200).json(userStatus);            
          });
         }
      });
   }
   catch (ex) {
      return res.status(401).json({success: false, message: "Invalid authentication token."});
   }
});


router.post("/account/create", (req, res)=> {
      
    console.log(req.body.email+"   "+req.body.fullname+"  "+req.body.password);

  bcrypt.hash(req.body.password, null, null, function(err, hash) {
       User.findOne({email:req.body.email},function(err,user){
              if(err){     
                  res.status(400).json({create:false,message:err+" db error"});
               }
             else {

                if(user==null){
                   var newuser=new User({
                  email: req.body.email,
                  fullName:  req.body.fullname,
                  passwordHash: hash
                  });
                  newuser.save( function(err, user) {
                  if (err) {
            //  console.error(err);
                    console.log("Fail store create user  db error");   
                    res.status(400).json({create:false,message:err+" db error"});  
               
                  }
                 else  {
                   console.log("success create a user");
                  
                  var tokeninput = crypto.randomBytes(64).toString('hex');
                 // create a newtoken
                  var newtoken=new token({
                     _userId: user._id,
                     token: tokeninput
                  });
                  newtoken.save(function(err){
                      if(err){
                        res.status(400).json({create:false,message:err+" db error"});  
                      }
                       //   Send the email
                      var transporter = nodemailer.createTransport({ service: 'Gmail', auth: { user: 'uvfit2018@gmail.com', pass: 'UVFit2018@AZ&' } });
                      var mailOptions = { from: 'uvfit2018@gmail.com', to: req.body.email, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + "/confirmation?id=" +tokeninput};
                      transporter.sendMail(mailOptions, function (err) {
                      if (err) {    console.log(err);  return res.status(400).json({create:false,message:"Error: send user email"});; }
                      res.status(200).json({create:false,message:'Success create a user , A verification email has been sent to ' + user.email + '. please do email verification within one hours'});
                      });    
                      //   res.status(201).json({create:true,message:"Success create a user"});   
                  }); 

                 }
                }); 
               }
             else{
                      
                  res.status(400).json({create:false,message:"User  already exit, please choose another email"});
            }

        } 

    });
  });

  

});

router.get("/confirmation", (req, res)=> {

     
        console.log(req.param('id'));
      token.findOne({token:req.param('id')},function(err,token)
      {
         
              if(token!=null)
              {
                console.log("user  id : "+token._userId);
                User.findOne({ _id: token._userId }, function (err, user) {
                if (!user) return res.status(400).json({ msg: 'We were unable to find a user for this token.' });
                if (user.isVerified) return res.status(400).json({ type: 'already-verified', msg: 'This user has already been verified.' });
 
                 // Verify and save the user
                user.isVerified = true;
                user.save(function (err) {
                   if (err) { return res.status(500).send({ msg: err.message }); }
                   res.redirect('login');
                  // res.status(200).json({msg:"The account has been verified. Please log in."});
                 });
              });
            }
          else{
              res.status(500).json({type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.'});       
          }

      });

});

router.post("/account/resend", (req, res)=> {

     console.log("user email  verifty: "+req.body.email);
     User.findOne({email:req.body.email},function(err,user)
      {
          if(err)
          {   
            res.status(400).json({type:false,message:err+" db error"});
          }
          else
          {

              if(user!=null)
              {
                console.log("user email  verifty: "+user.email);
               if (user.isVerified) return res.status(400).send({ message: 'This account has already been verified. Please log in.' });
                 var tokeninput = crypto.randomBytes(64).toString('hex');
                 // create a newtoken
                  var newtoken=new token({
                     _userId: user._id,
                     token: tokeninput
                  });
                  newtoken.save(function(err){
                      if(err){
                        res.status(400).json({type:false,message:err+" db error"});  
                      }
                      else{
                            //   Send the email
                         var transporter = nodemailer.createTransport({ service: 'Gmail', auth: { user: 'uvfit2018@gmail.com', pass: 'UVFit2018@AZ&' } });
                         var mailOptions = { from: 'uvfit2018@gmail.com', to: req.body.email, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + "/confirmation?id=" +tokeninput};
                         transporter.sendMail(mailOptions, function (err) {
                         if (err) {    console.log(err);  return res.status(400).json({create:false,message:"Error: send user email"});; }
                            res.status(200).json({create:false,message:'Success create a user , A verification email has been sent to ' + user.email + '. please do email verification within one hours'});
                          });    
                      }
                 });
               
            }
          else{
              res.status(400).json({type:false,message:"We were unable to find a user with that email"});
          }
        }

      });

});
router.post("/account/login", (req, res)=> {
    
  //  console.log(req.body.email+"   "+req.body.password);
    User.findOne({email:req.body.email},function(err,user)
      {
          if(err)
          {   
            res.status(400).json({create:false,message:err+" db error"});
          }
          else
          {

              if(user!=null)
              {
                console.log("user email: "+user.email);

              bcrypt.compare(req.body.password, user.passwordHash, function(err, valid) {
                if(err){
                    res.status(400).json({create:false,message:"Error authenticating. Please contact support."}); 
                }
               else{
                  if(valid){

                    if(!user.isVerified)  res.status(401).send({ type: 'not-verified', message: 'Your account has not been verified.' }); 
                    else{
                    var token = jwt.encode({email: req.body.email}, secret);
                    console.log("Success find user");
                    res.status(201).json({create:true,message:"sucess find",token:token});
                    }
                  }
                  else {
                    console.log(req.body.password+" hash "+user.passwordHash);
                    res.status(400).json({create:false,message:"The email or password provided was invalid."});
                  }
               }
             });
            }
          else{
              res.status(400).json({create:false,message:"No any record find, please do create."});
          }
        }

      });
   // res.status(201).json({message:"testing"});
   // res.render("login");
});



router.get("/test", (req, res,next)=> {

    /*store testing data  */
    console.log("store testing data");
    var newActivities= new Activities({
     activityType: "walk",
     lats:      115,
     lons:       167,
     speeds:       3,
     uvIndices:    2,
     duration:     3600,
     calories:     1200, 
     uvExposure:    500,
     deviceId:      "11f4baaef3445ff"
    });
    newActivities.save( function(err, activities) {
           if (err) {
            //  console.error(err);
               console.log("Fail store activities data");
           
               
           }
           else {
              console.log("success store activities data");
            
           }
      });

    var newuser=new User({

     email:  "demo@email.com",
     fullName:    "demo",
     passwordHash: "123",
     userDevices:  "11f4baaef3445ff",
      uvThreshold:  12
    });
   newuser.save( function(err, user) {
           if (err) {
            //  console.error(err);
               console.log("Fail store user data");      
               
           }
           else {
              console.log("success store user data");
            
           }
      });
    

});
// register device
router.post("/devices/register", (req, res,next)=> {


  
   // check device ID already register
    Device.findOne({deviceId:req.body.deviceId}, function(err, device) {
        if(!err)
        {
            if(device!=null)
            {
             console.log("Already registered ");
             res.status(201).json( {registered: false, message: "Device ID="+req.body.deviceId+" already registered"});
            }
            else
            {
              // Get a new apikey
              var  deviceApikey = getNewApikey();
              console.log("Register a new device"+req.body.deviceId);
               var NewDevice = new Device({
               userEmail: req.body.email,
               deviceId:req.body.deviceId,
                deviceName: req.body.deviceName,
                 apikey:  deviceApikey   
                }); 
                 NewDevice.save( function(err, device) {
                  if (err) {
                  //  console.error(err);
                  console.log("Fail store");
                   res.status(400).json( {registered: false, message: err+" db error fail create"});
               
                 }
                 else {
                         console.log("success store");

                         User.update({email:req.body.email},{$push:{userDevices:req.body.deviceId}},function(err,user){
                             if(err)
                              console.log(err);
                            else
                            {
                              console.log("success update user ");
                               res.status(201).json( {registered: true, message: "Device ID:"+req.body.deviceId + " was registered."}) 
                            }
                         });
               }
               });
          }
        }
        else
        {       
            res.status(400).json( {registered: false, message: err+" db error "});
         
         }
      });


})

// view data
router.post("/activities/user", (req, res,next)=> {
   
  /*  var responseJson = { found:false,
                        activities:[
                        {type: "",
                         date:""
                       }
                        ],
                       message:""};
      */
              
     var responseJson = { found:false,
                        activities:[  ],
                       message:""};

    
    console.log(req.body.email+"   "+req.body.deviceId);
    var Email=req.body.email;
    User.findOne({email:Email}, function(err,user){
        if(err)
        {
            res.status(400).json( {found: false, message: err+"  db error find user"});
        }
       else
       {

        if(user!=null)
        {
         console.log(user.userDevices);
         Activities.find({deviceId:user.userDevices[0]},function(err,activities)
          {
            if(err)
            {
                res.status(400).json( {found: false, message: err+" can not find any activities record"});
            }
            else
            {
                responseJson.found=true;
                responseJson.message="Activities found.";
               
                for(var act of  activities)
                {
                  responseJson.activities.push({ 
                      "type": act.activityType,
                      "date":act.timePublished,
                      "duration": act.duration,
                      "calories":  act.calories, 
                      "uvExposure":  act.uvExposure
                  });
                }
               //  console.log(responseJson);
                res.status(201).json(responseJson);
            }
          });

        }
        else
        {
           res.status(400).json( {found: false, message: err+"  user email do not exit, please create account first"});
        }

      }

    });
   // res.render("profile");
})

module.exports = router;
