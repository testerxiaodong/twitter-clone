import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.token
    // 没有token
    if (!token) {
      return res.status(401).json({ message: 'Not authorized: no token' })
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // token 过期/无效
    if (!decoded) {
      return res.status(401).json({ message: 'Not authorized: invalid token' })
    }
    const user = await User.findById(decoded.userId).select('-password')
    // 用户不存在
    if (!user) {
      return res.status(401).json({ message: 'Not authorized: user not found' })
    }
    // 验证通过, 将用户信息添加到req对象中
    req.user = user
    next()
  } catch (error) {
    console.log(`Error in protectRoute middleware: ${error}`)
    return res.status(500).json({ message: 'Server error' })
  }
}
