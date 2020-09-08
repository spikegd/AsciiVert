const fs = require('fs')
const { read, intToRGBA } = require('jimp')
const { createCanvas } = require('canvas')
const symbols = ['@', '#', '$', '%', ';', ':', '^', '*', ',', '.', '\'', ' ']

/**
 * Convert a single image file to ascii art.
 * 
 * @param {String} infile 
 *  Path to image file.
 * @param {Object} resolution 
 *  Desired resolution.
 * @param {Boolean} color
 *  Store color data as well.
 */
exports.imageToText = (infile, resolution, color = false) => {
  return new Promise((resolve, reject) => {
    read(infile, (err, img) => {
      if (err) reject(err)
      if (!img) reject ('Invalid image file.')
      // Array for storing color data
      let colArr = []

      // Image w/h
      let iHeight = img.bitmap.height
      let iWidth = img.bitmap.width
      if(!resolution) {
        resolution = {
          width: iWidth,
          height: iHeight
        }
      }

      // Downscaled dimensions
      let str = ''
      let downscale = {
        x: Number(iWidth) / Number(resolution.width),
        y: Number(iHeight) / Number(resolution.height)
      }
  
      // Iterate through each pixel in the image
      for (let y = 0; y <= resolution.height; y++) {
        let row = ''
  
        for (let x = 0; x <= resolution.width; x++) {
          // Since we downscale we only get the relevant pixels, evenly calculated/distributed
          let rgba = intToRGBA(img.getPixelColor(x * downscale.x, y * downscale.y))
          row += calculateSymbol(rgba, symbols)

          // Push color data
          if (color) colArr.push(rgbToHex(rgba.r, rgba.g, rgba.b))
  
          // If we're done, start the next row
          if (x == resolution.width) str += row + '\n'
        }
  
        // When we finish, we can return some useful data
        // that also includes the raw string
        if (y == resolution.height) {
          resolve({
            width: resolution.width,
            height: resolution.height,
            color: colArr,
            content: str
          })
        }
      }
    })
  })
}

/**
 * Convert a string of text to an image file.
 * 
 * @param {Object} textObj 
 *  Text to be made into image.
 * @param {String} outfile 
 *  Path to the finished file.
 */
exports.textToImage = (outfile, textObj) => {
  return new Promise((resolve, reject) => {
    if (typeof (textObj) !== 'object') reject('Invalid text object')

    // Create canvas assuming we are supplied with an
    // object that contains the width, height, and text
    let canvas = createCanvas(textObj.width * 16, textObj.height * 15.5)
    let ctx = canvas.getContext('2d')
  
    // Fill with white
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  
    // Write text to image using monospaced font for equal spacing
    ctx.font = 'bold 10pt Courier'
    ctx.fillStyle = 'black'

    if (!textObj.color.length > 0) {
      // The easy way
      ctx.fillText(textObj.content, 0, 0)
    } else {
      // The hard way
      textWithColor(ctx, textObj)
    }
  
    resolve(writebuf(outfile, canvas.toDataURL('image/png')))
  })
}

/**
 * Draw colored text to canvas.
 * 
 * @param {Context} ctx 
 *  Canvas context.
 * @param {Object} obj
 *  Text object.
 */
function textWithColor(ctx, obj){
  // Get each line
  let lines = obj.content.split('\n')
  let lineHeight = 16

  ctx.font = 'bold 10pt Courier'

  // Iterate through each line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Iterate through each character
    for (var x = 0; x < line.length; x++) {
      // Current character
      let str = line.charAt(x)
      // Width of character (for drawing)
      let mW = ctx.measureText(str).width
      // Get color of symbol
      let col = obj.color[(x * i)]
      ctx.fillStyle = col
      ctx.fillText(str, x * mW, i * lineHeight) 
    }
  }
}

/**
 * 
 * @param {String} filename 
 *  File to write.
 * @param {String} img 
 *  Image to write.
 */
async function writebuf(filename, img) {
  let data = img.replace(/^data:image\/\w+;base64,/, '')
  let buf = new Buffer(data, 'base64')
  return await fs.writeFileSync(filename, buf)
}

/**
 * 
 * @param {Object} color 
 *  RGB color object.
 * @param {Array} symbols 
 *  Array of available symbols.
 */
function calculateSymbol(color, symbols) {
  // https://www.nbdtech.com/Blog/archive/2008/04/27/Calculating-the-Perceived-Brightness-of-a-Color.aspx
  let brightness = Math.sqrt(
    (.241 * color.r * color.r) +
    (.691 * color.g * color.g) +
    (.068 * color.b * color.b)
  )

  let index = Math.round(brightness / (255 / (symbols.length-1)))

  // Return the symbol with a space appended to the beginning.
  return ` ${symbols[index]}`
}

/**
 * Convert number to hex value
 * 
 * @param {Number} n 
 */
function hexify(n) {
  let hex = n.toString(16)
  return hex.length == 1 ? '0' + hex:hex
}

/**
 * Convert RGB color to hex color
 * 
 * @param {Number} r 
 * @param {Number} g 
 * @param {Number} b 
 */
function rgbToHex(r, g, b) {
  return '#' + hexify(r) + hexify(g) + hexify(b)
}