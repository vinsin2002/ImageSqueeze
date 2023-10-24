const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const jpeg = require('jpeg-js');
const { Worker, isMainThread, parentPort } = require('worker_threads');
const cors = require('cors');

const app = express();
const port = 3000;

// Configure Multer to store uploaded images in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Handle image compression request
app.post('/compress-image', upload.single('image'), (req, res) => {
  const imageBuffer = req.file.buffer;
  const compressionValue = req.body.compressionValue;

  if (!imageBuffer) {
    return res.status(400).send('Invalid request data.');
  }
  console.log("Image came from client ⚛️⚛️🔥");
  console.log("compressing_image ..... 🚀🚀💪💪 ");
  const inputImagePath = 'tempImage.jpg'; // Temporary input image path
  const outputImagePath = 'compressed.jpg'; // Output image path

  fs.writeFileSync(inputImagePath, imageBuffer);

  const encodeWorker = new Worker('./encodingWorker.js', {
    workerData: {
      inputImagePath,
      outputImagePath,
      quality: compressionValue,
    },
  });

  encodeWorker.on('message', (message) => {
    if (message.status === 'success') {
      // Read the compressed image and send it to the client as 'compressedImage'
      const compressedImageData = fs.readFileSync(outputImagePath);
      const base64EncodedImage = compressedImageData.toString('base64');
      console.log("image compressed ✅✅🥳🥂")
      res.status(200).json({
        compressedImage: base64EncodedImage, // Send the compressed image as 'compressedImage'
      });
    } else {
      console.error('Error in encoding worker ❌❌:', message.error);
      res.status(500).send('Image compression failed. ❌❌');
    }
  });

  encodeWorker.postMessage(null);
});

app.listen(port, () => {
  console.log(`Server is listening on port ✅🥂 ${port}`);
});
