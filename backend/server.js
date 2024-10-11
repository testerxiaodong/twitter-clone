import express from 'express'
import authRoutes from './routes/auth.routes.js'
import dotenv from 'dotenv'
import connectMongoDB from './db/connectMongoDB.js'

// 加载环境变量
dotenv.config()

// 创建 Express 实例
const app = express()
const PORT = process.env.PORT || 5000

// 用户登陆认证相关路由
app.use('/api/auth', authRoutes)

app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}!`)
  // 连接数据库
  connectMongoDB()
})
