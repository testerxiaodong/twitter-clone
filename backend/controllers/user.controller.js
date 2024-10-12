import bcrypt from 'bcryptjs/dist/bcrypt.js'
import User from '../models/user.model.js'
import Notification from '../models/notification.model.js'
import mongoose from 'mongoose'

export const getUserProfile = async (req, res) => {
  try {
    // 从路径参数中获取用户名
    const { username } = req.params
    // 根据用户名查询用户信息
    const user = await User.findOne({ username }).select('-password')
    // 如果用户不存在，返回 404
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    return res.status(200).json(user)
  } catch (error) {
    console.log(`Error in getUserProfile: ${error.message}`)
  }
}

export const getSuggestedUsers = async (req, res) => {
  try {
    // 获取当前登陆用户的用户信息
    const userId = req.user._id
    // 根据用户 ID 查询用户关注的人
    const usersFollowedByMe = await User.findById(userId).select('following')
    // 从users集合中随机选取 10 个用户
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      { $sample: { size: 10 } },
    ])
    // 过滤掉已经关注我的用户
    const filteredUsers = users.filter(
      (user) => !usersFollowedByMe.following.includes(user._id)
    )
    // 限制返回的用户数量为 4
    const suggestedUsers = filteredUsers.slice(0, 4)

    // 隐藏密码信息
    suggestedUsers.forEach((user) => (user.password = null))

    res.status(200).json(suggestedUsers)
  } catch (error) {
    console.log(`Error in getSuggestedUsers: ${error.message}`)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const followUnfollowUser = async (req, res) => {
  try {
    // 获取要关注用户的 ID
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }
    // 获取当前登陆用户的 ID
    const currentUserId = req.user._id
    // 不能对自己进行关注/取消关注
    if (currentUserId.toString() === id) {
      return res
        .status(400)
        .json({ message: 'You cannot follow/unfollow yourself' })
    }
    // 查询当前用户信息 与 操作对象的用户信息
    const currentUser = await User.findById(currentUserId)
    const userToModify = await User.findById(id)
    if (!userToModify || !currentUser) {
      return res.status(400).json({ message: 'User not found' })
    }
    // 判断操作类型
    const isFollowing = currentUser.following.includes(id)

    if (isFollowing) {
      // 取消关注
      await User.findByIdAndUpdate(id, {
        $pull: { followers: req.user._id },
      })
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: id },
      })

      // TODO: 返回用户id
      return res.status(200).json({ message: 'Unfollowed user' })
    } else {
      // 关注
      await User.findByIdAndUpdate(id, {
        $push: { followers: req.user._id },
      })
      await User.findByIdAndUpdate(req.user._id, {
        $push: { following: id },
      })
      // 关注完成，发送通知
      const newNitification = new Notification({
        from: currentUserId,
        to: id,
        type: 'follow',
      })
      await newNitification.save()

      // TODO: 返回用户id
      return res.status(200).json({ message: 'Followed user' })
    }
  } catch (error) {
    console.log(`Error in followUnfollowUser: ${error.message}`)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateUser = async (req, res) => {
  try {
    // 结构请求参数
    const {
      fullName,
      username,
      email,
      currentPassword,
      newPassword,
      bio,
      link,
    } = req.body
    let { profileImg, coverImg } = req.body
    let user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    // 判断是否修改了密码
    if (
      (!currentPassword && newPassword) ||
      (currentPassword && !newPassword)
    ) {
      return res
        .status(400)
        .json({ message: 'Both current and new password are required' })
    }
    if (currentPassword && newPassword) {
      // 验证密码是否正确
      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password' })
      }
      // 新密码长度不能小于6
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: 'Password must be at least 6 characters long' })
      }
      // 加密并设置新密码
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(newPassword, salt)
      user.password = hashedPassword
    }
    if (profileImg) {
      // 用户原有头像存在时，删除原有头像
      if (user.profileImg) {
        await cloudinary.uploader.destroy(
          user.profileImg.split('/').pop().split('.')[0]
        )
      }
      const uploadedResponse = await cloudinary.uploader.upload(profileImg)
      profileImg = uploadedResponse.secure_url
    }

    if (coverImg) {
      // 用户原有封面存在时，删除原有封面
      if (user.coverImg) {
        await cloudinary.uploader.destroy(
          user.coverImg.split('/').pop().split('.')[0]
        )
      }

      const uploadedResponse = await cloudinary.uploader.upload(coverImg)
      coverImg = uploadedResponse.secure_url
    }

    user.fullName = fullName || user.fullName
    user.email = email || user.email
    user.username = username || user.username
    user.bio = bio || user.bio
    user.link = link || user.link
    user.profileImg = profileImg || user.profileImg
    user.coverImg = coverImg || user.coverImg

    user = await user.save()

    // password should be null in response
    user.password = null

    return res.status(200).json(user)
  } catch (error) {
    console.log(`Error in updateUser: ${error.message}`)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
