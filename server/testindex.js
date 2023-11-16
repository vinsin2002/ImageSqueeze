const express = require('express');
const { Worker } = require('worker_threads');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const cors = require('cors');

const app = express();
const port = 3000;

// Configure Multer to store uploaded images in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/compress-image', upload.single('image'), async (req, res) => {
  const imageBuffer = req.file.buffer;
  const compressionValue = req.body.compressionValue;
  if (!imageBuffer) {
    return res.status(400).send('Invalid request data.');
  }
  else
  {
    console.log("Image came from client ⚛️⚛️🔥");
   console.log("compressing_image ..... 🚀🚀💪💪 ");
  }

  const inputImagePath = 'tempImage.jpg'; // Temporary input image path
  const outputImagePath = 'compressed.jpg'; // Output image path

  fs.writeFileSync(inputImagePath, imageBuffer);

  try {
    // The image compression function you provided
    const reductionPercentage = compressionValue;
    const sizeBeforeCompression = Buffer.byteLength(imageBuffer); // Size of the original image in bytes

    await compressImageWithSizeReduction(inputImagePath, outputImagePath, reductionPercentage, 0);

    const compressedImageData = fs.readFileSync(outputImagePath);
    const base64EncodedImage = compressedImageData.toString('base64');
    const sizeAfterCompression = Buffer.byteLength(compressedImageData);
    const sizeReductionKB = (sizeBeforeCompression - sizeAfterCompression) / 1024; // Size reduction in KB
    console.log("image compressed ✅✅🥳🥂")
    // Send the compressed image, size reduction information, and compressed image size to the client
    res.json({
      compressedImage: base64EncodedImage,
      sizeReductionKB: sizeReductionKB,
      compressedImageSizeKB: sizeAfterCompression / 1024,
    });

    // Clean up: Remove temporary input image
    fs.unlinkSync(inputImagePath);
  } catch (error) {
    console.error('Error in encoding worker ❌❌:', message.error);
      res.status(500).send('Image compression failed. ❌❌');
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ✅🥂 ${port}`);
});
function dct2(inputMatrix) {
  const numRows = inputMatrix.length;
  const numCols = inputMatrix[0].length;
  const outputMatrix = [];
  // Compute the 1D DCT of each row
  for (let i = 0; i < numRows; i++) {
    const row = inputMatrix[i];
    const dctRow = fastDct(row);
    outputMatrix.push(dctRow);
  }
  // Compute the 1D DCT of each column
  for (let j = 0; j < numCols; j++) {
    const col = outputMatrix.map(row => row[j]);
    const dctCol = fastDct(col);
    for (let i = 0; i < numRows; i++) {
      outputMatrix[i][j] = dctCol[i];
    }
  }
  return outputMatrix;
}
function fastDct(inputArray) {
  const N = inputArray.length;
  const outputArray = new Array(N);
  // Precompute constants
  const c1 = Math.sqrt(2 / N);
  const c2 = Math.PI / (2 * N);
  // Compute the DCT
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += inputArray[n] * Math.cos((2 * n + 1) * k * c2);
    }
    outputArray[k] = c1 * sum;
    if (k === 0) {
      outputArray[k] /= Math.SQRT2;
    }
  }
  return outputArray;
}
function idct2(inputMatrix) {
  const numRows = inputMatrix.length;
  const numCols = inputMatrix[0].length;
  const outputMatrix = [];
  // Compute the 1D IDCT of each column
  for (let j = 0; j < numCols; j++) {
    const col = inputMatrix.map(row => row[j]);
    const idctCol = fastIdct(col);
    for (let i = 0; i < numRows; i++) {
      outputMatrix[i] = outputMatrix[i] || [];
      outputMatrix[i][j] = idctCol[i];
    }
  }
  // Compute the 1D IDCT of each row
  for (let i = 0; i < numRows; i++) {
    const row = outputMatrix[i];
    const idctRow = fastIdct(row);
    outputMatrix[i] = idctRow;
  }
  return outputMatrix;
}
function fastIdct(inputArray) {
  const N = inputArray.length;
  const outputArray = new Array(N);

  // Precompute constants
  const c1 = Math.sqrt(2 / N);
  const c2 = Math.PI / (2 * N);

  // Compute the IDCT
  for (let n = 0; n < N; n++) {
    let sum = inputArray[0] / Math.SQRT2;
    for (let k = 1; k < N; k++) {
      sum += inputArray[k] * Math.cos((2 * n + 1) * k * c2);
    }
    outputArray[n] = c1 * sum;
  }

  return outputArray;
}
async function downsample8x8(matrix, compressionFactor) {
    return new Promise((resolve) => {
      const downsampleWorker = new Worker(path.join(__dirname, 'downsample.js'), {
        workerData: { matrix, compressionFactor },
      });
  
      // Listen for the result message from the worker
      downsampleWorker.on('message', (result) => {
        resolve(result);
      });
  
      // Send a message to the worker to start the downsampling
      downsampleWorker.postMessage({ type: 'downsample', matrix, compressionFactor });
    });
  }
  



async function upsample8x8(matrix, originalWidth, originalHeight, blockSize) {
    return new Promise((resolve) => {
        const upsampleWorker = new Worker(path.join(__dirname, 'upsample.js'), {
          workerData: { matrix,originalHeight,originalWidth,blockSize},
        });
    
        // Listen for the result message from the worker
        upsampleWorker.on('message', (result) => {
          resolve(result);
        });
    
        // Send a message to the worker to start the upsampling
        upsampleWorker.postMessage({ type: 'upsample', matrix,originalHeight,originalWidth, blockSize});
      });
  }

  // Fill each 8x8 block with the same value as the corresponding position in the input matrix

// Helper function to safely get the value from a matrix
function getMatrixValue(matrix, row, col) {
  return matrix[row] ? (matrix[row][col] || 0) : 0;
}

// Helper function to safely set the value in a matrix
function setMatrixValue(matrix, row, col, value) {
  if (!matrix[row]) {
      matrix[row] = [];
  }
  matrix[row][col] = value;
}

async function compressImageWithSizeReduction(inputImagePath, outputImagePath, quality, reductionPercentage) {
  // Read the input image
  return new Promise(async (resolve, reject) => {
  const jpegDataIn = fs.readFileSync(inputImagePath);
  const rawImageDataIn = jpeg.decode(jpegDataIn);

  // Apply 4:2:0 chroma subsampling
  const widthIn = rawImageDataIn.width;
  const heightIn = rawImageDataIn.height;
  const dataIn = rawImageDataIn.data;

  for (let y = 0; y < heightIn; y += 2) {
    for (let x = 0; x < widthIn; x += 2) {
      const offsetIn = (y * widthIn + x) * 4;
      const rIn = dataIn[offsetIn];
      const gIn = dataIn[offsetIn + 1];
      const bIn = dataIn[offsetIn + 2];
      dataIn[offsetIn + 2] = bIn; // Keep the blue channel
    }
  }

  // Calculate the new dimensions based on the reduction percentage
  const newWidth = Math.round(widthIn * (1 - reductionPercentage / 100));
  const newHeight = Math.round(heightIn * (1 - reductionPercentage / 100));

  // Convert the modified raw image data to separate color channel matrices
  let inputMatrixR = [];
  let inputMatrixG = [];
  let inputMatrixB = [];
  for (let y = 0; y < newHeight; y++) {
    const rowInR = [];
    const rowInG = [];
    const rowInB = [];
    for (let x = 0; x < newWidth; x++) {
      // Calculate the corresponding coordinates in the original image
      const originalX = Math.round(x / newWidth * widthIn);
      const originalY = Math.round(y / newHeight * heightIn);

      const offsetIn = (originalY * widthIn + originalX) * 4;
      const rIn = dataIn[offsetIn];
      const gIn = dataIn[offsetIn + 1];
      const bIn = dataIn[offsetIn + 2];
      rowInR.push(rIn);
      rowInG.push(gIn);
      rowInB.push(bIn);
    }
    inputMatrixR.push(rowInR);
    inputMatrixG.push(rowInG);
    inputMatrixB.push(rowInB);
  }
  // console.log("before : "+inputMatrixR);
  inputMatrixR =  await downsample8x8(inputMatrixR,quality);
  inputMatrixG = await downsample8x8(inputMatrixG,quality);
  inputMatrixB = await downsample8x8(inputMatrixB,quality);
  // Perform DCT-II on each color channel matrix
  const dctWorkerR = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixR } });
  const dctWorkerG = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixG } });
  const dctWorkerB = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixB } });

  // Wait for DCT worker threads to finish
  Promise.all([
    new Promise((resolve) => dctWorkerR.on('message', resolve)),
    new Promise((resolve) => dctWorkerG.on('message', resolve)),
    new Promise((resolve) => dctWorkerB.on('message', resolve)),
  ]).then(([resultR, resultG, resultB]) => {
    let compressedMatrixR = resultR.resultMatrix;
    let compressedMatrixG = resultG.resultMatrix;
    let compressedMatrixB = resultB.resultMatrix;

  // Discard high-frequency coefficients based on the quality parameter
  // (Note: Adjust this part based on the specific requirements)
  // (For simplicity, this example discards coefficients beyond a certain threshold)
  const thresholdR = quality * 0.01; // Adjust this factor as needed
  const thresholdG = quality * 0.01; // Adjust this factor as needed
  const thresholdB = quality * 0.01; // Adjust this factor as needed

  compressedMatrixR = compressedMatrixR.map(row => row.map(val => (Math.abs(val) > thresholdR) ? val : 0));
  compressedMatrixG = compressedMatrixG.map(row => row.map(val => (Math.abs(val) > thresholdG) ? val : 0));
  compressedMatrixB = compressedMatrixB.map(row => row.map(val => (Math.abs(val) > thresholdB) ? val : 0));
  // Perform IDCT-II on each compressed color channel matrix
  const idctWorkerR = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixR } });
    const idctWorkerG = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixG } });
    const idctWorkerB = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixB } });

    // Wait for IDCT worker threads to finish
    Promise.all([
      new Promise((resolve) => idctWorkerR.on('message', resolve)),
      new Promise((resolve) => idctWorkerG.on('message', resolve)),
      new Promise((resolve) => idctWorkerB.on('message', resolve)),
    ]).then(async ([resultR, resultG, resultB]) => {
      let outputMatrixR = resultR.resultMatrix;
      let outputMatrixG = resultG.resultMatrix;
      let outputMatrixB = resultB.resultMatrix;

  // Upsample to original size
  
  outputMatrixR = await upsample8x8(outputMatrixR, widthIn, heightIn,8-(quality/50));
  outputMatrixG = await upsample8x8(outputMatrixG, widthIn, heightIn,8-(quality/50));
  outputMatrixB = await upsample8x8(outputMatrixB, widthIn, heightIn,8-(quality/50));


  // Convert the output matrices to raw image data
  let widthOut, heightOut, dataOut;
  widthOut = widthIn;
  heightOut = heightIn;
  dataOut = Buffer.alloc(widthOut * heightOut * 4);
  outputMatrixR.forEach((rowOut, rowIndex) => {
    rowOut.forEach((value, colIndex) => {
      // Clamp the pixel value to [0, 255]
      const rValue = Math.max(0, Math.min(255, Math.round(value)));
      const gValue = Math.max(0, Math.min(255, Math.round(outputMatrixG[rowIndex][colIndex])));
      const bValue = Math.max(0, Math.min(255, Math.round(outputMatrixB[rowIndex][colIndex])));
      const offsetOut = (rowIndex * widthOut + colIndex) * 4;
      dataOut[offsetOut] = rValue;
      dataOut[offsetOut + 1] = gValue;
      dataOut[offsetOut + 2] = bValue;
      dataOut[offsetOut + 3] = 255;
    });
  });

  // Encode the raw image data as JPEG
  const rawImageDataOut = {
    width: widthOut,
    height: heightOut,
    data: dataOut
  };
  const jpegDataOut = jpeg.encode(rawImageDataOut);

  // Write the output image
   // Write the output image
   fs.writeFile(outputImagePath, jpegDataOut.data, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
});
});
});
});
}