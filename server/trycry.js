const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const jpeg = require('jpeg-js');
const cors = require('cors');
const { Worker } = require('worker_threads');

const app = express();
const port = 3000;

// Configure Multer to store uploaded images in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/compress-image', upload.single('image'), (req, res) => {
  const imageBuffer = req.file.buffer;
  const compressionValue = req.body.compressionValue + 50;

  if (!imageBuffer) {
    return res.status(400).send('Invalid request data.');
  }

  const inputImagePath = 'tempImage.jpg'; // Temporary input image path
  const outputImagePath = 'compressed.jpg'; // Output image path

  fs.writeFileSync(inputImagePath, imageBuffer);

  try {
    const reductionPercentage = compressionValue;
    const sizeBeforeCompression = Buffer.byteLength(imageBuffer); // Size of the original image in bytes

    // Perform image compression with multi-threading
    compressImageWithSizeReduction(inputImagePath, outputImagePath, reductionPercentage, (result) => {
      const compressedImageData = fs.readFileSync(outputImagePath);
      const base64EncodedImage = compressedImageData.toString('base64');
      const sizeAfterCompression = Buffer.byteLength(compressedImageData);
      const sizeReductionKB = (sizeBeforeCompression - sizeAfterCompression) / 1024; // Size reduction in KB

      // Send the compressed image, size reduction information, and compressed image size to the client
      res.json({
        compressedImage: base64EncodedImage,
        sizeReductionKB: sizeReductionKB,
        compressedImageSizeKB: sizeAfterCompression / 1024,
      });

      // Clean up: Remove temporary input image
      fs.unlinkSync(inputImagePath);
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    res.status(500).send('Image compression failed.');
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

function compressImageWithSizeReduction(inputImagePath, outputImagePath, quality, callback) {
  // Read the input image
  try {
    console.log("Image received");

    // ...

    // Perform DCT-II on each color channel matrix using a worker
    const inputMatrixR = [];
    const inputMatrixG = [];
    const inputMatrixB = [];
    // ...

    const dctWorkerR = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixR } });
    const dctWorkerG = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixG } });
    const dctWorkerB = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixB } });

    Promise.all([
      new Promise((resolve) => dctWorkerR.on('message', resolve)),
      new Promise((resolve) => dctWorkerG.on('message', resolve)),
      new Promise((resolve) => dctWorkerB.on('message', resolve)),
    ]).then(([resultR, resultG, resultB]) => {
      const compressedMatrixR = resultR.resultMatrix;
      const compressedMatrixG = resultG.resultMatrix;
      const compressedMatrixB = resultB.resultMatrix;
      // ...

      // Perform IDCT-II on each compressed color channel matrix using a worker
      const idctWorkerR = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixR } });
      const idctWorkerG = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixG } });
      const idctWorkerB = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixB } });

      Promise.all([
        new Promise((resolve) => idctWorkerR.on('message', resolve)),
        new Promise((resolve) => idctWorkerG.on('message', resolve)),
        new Promise((resolve) => idctWorkerB.on('message', resolve)),
      ]).then(([resultR, resultG, resultB]) => {
        const outputMatrixR = resultR.resultMatrix;
        const outputMatrixG = resultG.resultMatrix;
        const outputMatrixB = resultB.resultMatrix;

        // Convert the output matrices to raw image data
        // ...

        // Encode the raw image data as JPEG
        const rawImageDataOut = {
          width: newWidth,
          height: newHeight,
          data: dataOut
        };
        const encodedData = jpeg.encode(rawImageDataOut, quality);

        // Write the output image
        fs.writeFileSync(outputImagePath, encodedData.data);

        console.log('Image compressed successfully.');

        callback(); // Call the callback to signal completion
      });
    });
  } catch (error) {
    console.error('Error compressing image:', error);
  }
}
