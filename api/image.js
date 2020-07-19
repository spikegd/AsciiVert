const fs = require('fs')
const path = require('path')
const { createUniqueID } = require('../util/util')
const image = require('../processor/image')
const { HTTPResponse } = require('./helper')
const mimes = [
  'image/png',
  'image/jpeg'
]

/**
 * Route for uploading and converting an image.
 * 
 * @param {Express} app 
 */
exports.imageRoute = (app) => {
  app.post('/image', async (req, res) => {
    if(!req.files) return res.send(HTTPResponse(400, 'Looks like you forgot a file!'))
    
    let file = req.files.files
    let id = createUniqueID()
    let dir = path.resolve(`./temp/images/${id}/`)
    let resolution = req.body && req.body.resolution ? JSON.parse(req.body.resolution):null

    // Data checking
    if(!file) return res.send(HTTPResponse(400, 'Looks like you forgot a file!'))
    if(!mimes.includes(file.mimetype)) return res.send(HTTPResponse(400, 'Looks like that isn\'t a supported file...'))

    // Since we know it *should* be okay, send a response with the file ID
    res.send(HTTPResponse(200, id))

    // Create temp dir for files
    await fs.mkdirSync(dir)
    await fs.writeFileSync(`${dir}/${file.name}`, file.data)

    // Get text from image
    let text = await image.imageToText(`${dir}/${file.name}`, resolution)
    
    // Create new completed directory to convert the file into
    await fs.mkdirSync(`./temp/completed/${id}`)

    // Make image back from text
    await image.textToImage(`./temp/completed/${id}/converted.jpg`, text)

    // Cleanup
    await fs.rmdirSync(dir, { recursive: true })
  })
}