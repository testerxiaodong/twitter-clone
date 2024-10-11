import jwt from 'jsonwebtoken'

const generateTokenAndSetCookie = (userId, res) => {
  // 生成jwt token，有效期为15天
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '15d',
  })

  // 设置cookie，httpOnly为true，防止前端代码获取cookie，有效期为15天
  res.cookie('token', token, {
    httpOnly: true, // 防止xss攻击
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15天
    sameSite: 'strict', // 防止跨域攻击
    secure: process.env.NODE_ENV !== 'development', // 只在生产环境下设置secure
  })
}

export default generateTokenAndSetCookie
