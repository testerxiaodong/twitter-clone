import User from '../models/user.model.js'
import Post from '../models/post.model.js'
import Notification from '../models/notification.model.js'
import { v2 as cloudinary } from 'cloudinary'

export const createPost = async (req, res) => {
  try {
    const { text } = req.body
    let { img } = req.body
    const userId = req.user_id.toString()
    // check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    // check if post has text or image
    if (!text && !img) {
      return res.status(400).json({ error: 'Post must have text or image' })
    }
    // upload image to cloudinary
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img)
      img = uploadedResponse.secure_url
    }
    // create new post
    const newPost = new Post({
      user: userId,
      text,
      img,
    })

    await newPost.save()
    res.status(201).json(newPost)
  } catch (error) {
    console.log(`Error creating post: ${error.message}`)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const deletePost = async (req, res) => {
  const { id } = req.params
  try {
    const post = await Post.findById(id)
    // check if post exists
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    // check if user is authorized to delete post
    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: 'You are not authorized to delete this post' })
    }
    // 如果有图片，删除云存储上的图片
    if (post.img) {
      await cloudinary.uploader.destroy(post.img.split('/').pop().split('.')[0])
    }
    // delete post
    await Post.findByIdAndDelete(id)
    res.status(200).json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.log(`Error deleting post: ${error.message}`)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const likeUnlikePost = async (req, res) => {
  const { id: postId } = req.params
  const userId = req.user._id
  try {
    const post = await Post.findById(postId)
    // check if post exists
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const isLiked = post.likes.includes(userId)
    if (isLiked) {
      // Unlike post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } })
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } })

      const updatedLikes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      )
      res.status(200).json(updatedLikes)
    } else {
      // Like post
      post.likes.push(userId)
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } })
      await post.save()

      const notification = new Notification({
        from: userId,
        to: post.user,
        type: 'like',
      })
      await notification.save()

      const updatedLikes = post.likes
      res.status(200).json(updatedLikes)
    }
  } catch (error) {
    console.log(`Error updating post: ${error.message}`)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const commentOnPost = async (req, res) => {
  const { text } = req.body
  const postId = req.params.id
  const userId = req.user._id
  try {
    if (!text) {
      return res.status(400).json({ error: 'Comment must have text' })
    }
    const post = await Post.findById(postId)
    // check if post exists
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const newComment = {
      user: userId,
      text,
    }
    post.comments.push(newComment)
    await post.save()
  } catch (error) {
    console.log(`Error updating post: ${error.message}`)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: '-password',
      })
      .populate({
        path: 'comments.user',
        select: '-password',
      })

    if (posts.length === 0) {
      return res.status(200).json([])
    }

    res.status(200).json(posts)
  } catch (error) {
    console.log(`Error getting all posts: ${error.message}`)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const getLikedPosts = async (req, res) => {
  const { userId } = req.params
  try {
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
      .populate({
        path: 'user',
        select: '-password',
      })
      .populate({
        path: 'comments.user',
        select: '-password',
      })

    res.status(200).json(likedPosts)
  } catch (error) {
    console.log(`Error getting liked posts: ${error.message}`)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const following = user.following

    const feedPosts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: '-password',
      })
      .populate({
        path: 'comments.user',
        select: '-password',
      })

    res.status(200).json(feedPosts)
  } catch (error) {
    console.log('Error in getFollowingPosts controller: ', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params

    const user = await User.findOne({ username })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'user',
        select: '-password',
      })
      .populate({
        path: 'comments.user',
        select: '-password',
      })

    res.status(200).json(posts)
  } catch (error) {
    console.log('Error in getUserPosts controller: ', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
