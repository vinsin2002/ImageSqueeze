const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const jpeg = require('jpeg-js');

function encodeImage(inputImagePath, outputImagePath, quality) {
  try {
    // Read the input image
    const jpegDataIn = fs.readFileSync(inputImagePath);
    const rawImageDataIn = jpeg.decode(jpegDataIn);

    // Your image processing logic here (e.g., apply 4:2:0 chroma subsampling)

    // Encode the raw image data as JPEG
    const rawImageDataOut = {
      width: rawImageDataIn.width,
      height: rawImageDataIn.height,
      data: rawImageDataIn.data, // Modify this as needed
    };

    const encodedData = jpeg.encode(rawImageDataOut, quality);

    // Write the output image
    fs.writeFileSync(outputImagePath, encodedData.data);

    parentPort.postMessage({ status: 'success' });
  } catch (error) {
    parentPort.postMessage({ status: 'error', error: error.message });
  }
}

// Entry point for the worker
const { inputImagePath, outputImagePath, quality } = workerData;
encodeImage(inputImagePath, outputImagePath, quality);
