import mongoose from 'mongoose'

const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    // 连接成功，控制台打印连接信息
    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (error) {
    // 连接mongodb失败，控制台打印错误信息，退出程序
    console.log(`Error connecting to MongoDB: ${error.message}`)
    process.exit(1)
  }
}

export default connectMongoDB
