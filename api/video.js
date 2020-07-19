const fs = require('fs')
const path = require('path')
const { createUniqueID } = require('../util/util')
const video = require('../processor/video')
const { HTTPError } = require('./helper')
const mimes = [
  'video/mp4'
]

/**
 * Route for uploading and converting videos.
 * 
 * @param {Express} app 
 */
exports.videoRoute = (app) => {
  app.post('/video', async (req, res) => {
    if(!req.files) return res.send(HTTPError(400, 'Looks like you forgot a file!'))
    
    let file = req.files.files
    let id = createUniqueID(10)
    let dir = path.resolve(`./temp/videos/${id}/`)
    let resolution = req.body && req.body.resolution ? JSON.parse(req.body.resolution):null
    let framerate = req.body && req.body.framerate ? JSON.parse(req.body.framerate):10

    if(!file) return res.send(HTTPError(400, 'Looks like you forgot a file!'))
    if(!mimes.includes(file.mimetype)) return res.send(HTTPError(400, 'Looks like that isn\'t a supported file...'))
    
    await fs.mkdirSync(dir)

    // Make temp dirs
    await fs.mkdirSync(`${dir}/original_frames/`)
    await fs.mkdirSync(`${dir}/converted_frames`)

    // Write video file to disk
    await fs.writeFileSync(`${dir}/${file.name}`, file.data)

    // Export the video into frames
    await video.videoToFrames(`${dir}/${file.name}`, `${dir}/original_frames/`, framerate)

    // Convert each frame
    await video.convertFrames(`${dir}/original_frames/`, `${dir}/converted_frames/`, resolution)

    // Stitch frames back into video
    await video.framesToVideo(`${dir}/converted_frames/`, `${dir}/${file.name.replace('.mp4', 'converted.mp4')}`, `${dir}/${file.name}`, framerate)

    // Finally done, now send the new video back
    res.sendFile(`${dir}/${file.name.replace('.mp4', 'converted.mp4')}`)
  })
}