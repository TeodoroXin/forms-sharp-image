const express = require('express')
const app = express()
const multer = require('multer')
const fs = require('fs')
const sharp = require('sharp')

const allowedMimetypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp']
	, targetSizeKB = 209715 // 200[KB]
	, maxAllowedSizeKB = 4194304 // 4[MB] 
	, targetMaxSide = 1800 // pixels
	, uploadDir = './images/'
// Multer variables, but with some shared configuration values
const opts = {
		storage: multer.memoryStorage(),
		limits : {
		  fileSize: maxAllowedSizeKB,
		  files: 2
		},
		fileFilter : function (_req, file, cb){
		  let type = allowedMimetypes.includes(file.mimetype)
		  type ? cb(null, true) : cb(new Error(`Only ${allowedMimetypes} are image formats allowed`), false)
		}
	};
	
let upload = multer(opts)

/* *~functions~* */
const helperImg = async (fileBuffer, newName, res) => {
	 // Will return resized images keeping its original aspect ratio, can return error or non modified input too.
	try {
		let inputOpts = {
			failOn : "error",
			limitInputPixels : 13860000  // 4200 × 3300 pixels
		}
		, bopt = {resolveWithObject: true}
		
		const image = sharp(fileBuffer, inputOpts);
		const metadata = await image.metadata()
		const {width, height, size, format} = metadata
		let imgMaxDimension = width > height ? width : height
		, newImage = image
		, newHeight = 320
		, newWidth = 320
		
		newWidth = width > height ? targetMaxSide : undefined;
		newHeight = height > width ? targetMaxSide : undefined;
		// console.log('imgMaxDimension: ', imgMaxDimension)
		// console.log('width, height, size, format: ', width, height, size, format)
		
		if (width < 320  || height < 320){
			throw new Error('Pixels below 320', {cause: 'Better quality image is required'})
		}
		// TODO: Add condition to deny crazy aspect ratios
		// Resizes when inputImg is greater than x kb. exceeds 1000 pixels, and is not webp format
		if ((size > targetSizeKB) && (imgMaxDimension >= 1000) && format != 'webp'){
			newImage = await newImage
			.resize({width: newWidth, height: newHeight})
			.toFormat('webp',{quality:80})
			.toBuffer(bopt)
		}
		else if(imgMaxDimension > targetMaxSide){
			newImage = await newImage
			.resize({width: newWidth, height: newHeight})
			.toBuffer(bopt)
		}
		else {
			// If there are not errors. and images don't need resize, accepts image in buffer
			newImage = {};
			newImage.info = {name: newName}
			newImage.data = fileBuffer
		}
		newImage.info.name = newName.split('.')
		newImage.info.format = newImage.info.format ?? newImage.info.name[1]
		console.log('newImageinfo: ', newImage.info)
		
		// fs.writeFileSync(`${uploadDir}${newImage.info.name[0]}.${newImage.info.format}`, newImage.data)
		res.status(200)
		res.send({data: `image loaded`})
	} catch (error) {
		console.error(error)
		res.status(403)
		res.send({cause: `Unacceptable image-format was send ${error.message}`})
	}
}
/* *~functions end~* */

app.get('/', (req, res) => {
  res.sendFile(__dirname +'/index.html')
})

app.post('/', upload.single('image'), (req, res) => {
	helperImg(req.file.buffer, req.file.originalname, res)

	upload = undefined; 
	delete helperImg;
})

app.listen(3005, () => {
  console.log('app en el puerto 3005')
})
