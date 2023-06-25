const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const dotenv = require('dotenv');


dotenv.config({path: './config.env' });

const secret = process.env.JWT_SECRET;
const jwtSecret = Buffer.from(secret).toString('base64');
const bcryptSalt = bcrypt.genSaltSync(10);


const signToken = id => {
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const login = async (req,res) => {
  const {username, password} = req.body;
  const foundUser = await User.findOne({username});
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign({userId:foundUser._id,username}, jwtSecret, {}, (err, token) => {
        res.cookie('token', token, {sameSite:'none', secure:true}).json({
          id: foundUser._id,
        });
      });
    }
  }
};


const signup  = async (req,res) => {
  console.log('Testing');
  const {username,password} = req.body;
  console.log(username, password);
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username:username,
      password:hashedPassword,
    });


    const token = signToken(createdUser._id);
    // console.log(token)

    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  
    res.cookie('token', token, cookieOptions);
    res.status(201).json({
      status: 'success',
      token,
      data: {
        id: createdUser._id,
        username
      }
    });

  } catch(err) {
    if (err) throw err;
    res.status(500).json('error');
  }
};


const logout = (req,res) => {
  res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
};


module.exports = {
  login,
  signup,
  logout
}