import express from 'express'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import postRoutes from './routes/post.routes.js'
import dotenv from 'dotenv'
import connectMongoDB from './db/connectMongoDB.js'
import cookieParser from 'cookie-parser'
import { v2 as cloudinary } from 'cloudinary'

// 加载环境变量
dotenv.config()
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// 创建 Express 实例
const app = express()
const PORT = process.env.PORT || 5000

// 开启json解析
app.use(express.json())
// 开启url编码解析，表单数据解析
app.use(express.urlencoded({ extended: true }))
// 开启cookie解析
app.use(cookieParser())

// 用户登陆认证相关路由
app.use('/api/auth', authRoutes)
// 用户信息相关路由
app.use('/api/users', userRoutes)
// 帖子相关路由
app.use('/api/posts', postRoutes)

app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}!`)
  // 连接数据库
  connectMongoDB()
})
