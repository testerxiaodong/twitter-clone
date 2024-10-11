import bcrypt from 'bcryptjs'
import User from '../models/user.model.js'
import generateTokenAndSetCookie from '../lib/utils/generateToken.js'

export const signup = async (req, res) => {
  try {
    const { username, fullName, email, password } = req.body
    if (!username || !fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    // 邮箱正则校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email' })
    }
    // 用户名是否已注册
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' })
    }
    // 邮箱是否已注册
    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long' })
    }
    // 密码加密
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    // 创建用户
    const newUser = new User({
      username,
      fullName,
      email,
      password: hashedPassword,
    })
    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res)
      await newUser.save()
      res.status(201).json({
        _id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        followers: newUser.followers,
        following: newUser.following,
        profileImg: newUser.profileImg,
        coverImg: newUser.coverImg,
      })
    } else {
      res.status(400).json({ error: 'Failed to create user' })
    }
  } catch (error) {
    console.log(`Error in signup controller: ${error.message}`)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const login = async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' })
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' })
    }
    generateTokenAndSetCookie(user._id, res)
    res.status(200).json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      followers: user.followers,
      following: user.following,
      profileImg: user.profileImg,
      coverImg: user.coverImg,
    })
  } catch (error) {
    console.log(`Error in login controller: ${error.message}`)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const logout = async (req, res) => {
  try {
    res.cookie('token', '', { maxAge: 0 })
    res.status(200).json({ message: 'Logged out successfully' })
  } catch (error) {
    console.log(`Error in logout controller: ${error.message}`)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.status(200).json(user)
  } catch (error) {
    console.log(`Error in getUser controller: ${error.message}`)
    res.status(500).json({ error: 'Internal server error' })
  }
}
