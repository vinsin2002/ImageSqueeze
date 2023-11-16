const express = require('express');
const { Worker } = require('worker_threads');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
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

app.post('/compress-image', upload.single('image'), (req, res) => {
  const imageBuffer = req.file.buffer;
  const compressionValue = req.body.compressionValue;
  console.log(compressionValue);
  console.log(imageBuffer);
  if (!imageBuffer || !compressionValue) {
    return res.status(400).send('Invalid request data.');
  }

  const inputImagePath = 'tempImage.jpg'; // Temporary input image path
  const outputImagePath = 'compressed.jpg'; // Output image path

  fs.writeFileSync(inputImagePath, imageBuffer);

  try {
    // The image compression function you provided
    const reductionPercentage = compressionValue;
    const sizeBeforeCompression = Buffer.byteLength(imageBuffer); // Size of the original image in bytes

    compressImageWithSizeReduction(inputImagePath, outputImagePath, reductionPercentage, 0);

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
  } catch (error) {
    console.error('Error compressing image:', error);
    res.status(500).send('Image compression failed.');
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
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
function downsample8x8(matrix, compressionFactor) {
  const downsampledMatrix = [];

  const numRows = matrix.length;
  const numCols = matrix[0].length;

  // Adjust block size based on compression factor
  const blockSize = Math.round(8 - (compressionFactor/50)); // Adjust this factor as needed

  for (let y = 0; y < numRows; y += blockSize) {
      const rowInOutput = [];

      for (let x = 0; x < numCols; x += blockSize) {
          let sum = 0;
          let count = 0;

          // Iterate over the dynamically determined block, considering boundaries
          for (let blockY = 0; blockY < blockSize && y + blockY < numRows; blockY++) {
              for (let blockX = 0; blockX < blockSize && x + blockX < numCols; blockX++) {
                  sum += matrix[y + blockY][x + blockX];
                  count++;
              }
          }

          // Calculate the average value for the block
          const average = Math.round(sum / count);

          // Save the average value for the dynamically determined block
          rowInOutput.push(average);
      }

      // Push the row for the output matrix
      downsampledMatrix.push(rowInOutput);
  }

  return downsampledMatrix;
}



function upsample8x8(matrix, originalWidth, originalHeight, blockSize) {
  const upsampledMatrix = [];

  // Calculate the scaling factor for width and height
  const scaleX = originalWidth / matrix[0].length;
  const scaleY = originalHeight / matrix.length;

  for (let y = 0; y < originalHeight; y++) {
      const originalY = y / scaleY;
      const floorY = Math.floor(originalY);
      const ceilY = Math.min(matrix.length - 1, Math.ceil(originalY)); // Limit to the last row
      const yFraction = originalY - floorY;

      const rowInOutput = [];

      for (let x = 0; x < originalWidth; x++) {
          const originalX = x / scaleX;
          const floorX = Math.floor(originalX);
          const ceilX = Math.min(matrix[0].length - 1, Math.ceil(originalX)); // Limit to the last column
          const xFraction = originalX - floorX;

          const topLeft = getMatrixValue(matrix, floorY, floorX);
          const topRight = getMatrixValue(matrix, floorY, ceilX);
          const bottomLeft = getMatrixValue(matrix, ceilY, floorX);
          const bottomRight = getMatrixValue(matrix, ceilY, ceilX);

          const topInterpolation = topLeft + xFraction * (topRight - topLeft);
          const bottomInterpolation = bottomLeft + xFraction * (bottomRight - bottomLeft);

          rowInOutput.push(topInterpolation + yFraction * (bottomInterpolation - topInterpolation));
      }

      // Push the row for the output matrix
      upsampledMatrix.push(rowInOutput);
  }

  // Fill each 8x8 block with the same value as the corresponding position in the input matrix
  for (let y = 0; y < originalHeight; y += blockSize) {
      for (let x = 0; x < originalWidth; x += blockSize) {
          const value = getMatrixValue(upsampledMatrix, y, x);
          for (let blockY = 0; blockY < blockSize && y + blockY < originalHeight; blockY++) {
              for (let blockX = 0; blockX < blockSize && x + blockX < originalWidth; blockX++) {
                  setMatrixValue(upsampledMatrix, y + blockY, x + blockX, value);
              }
          }
      }
  }

  return upsampledMatrix;
}

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

function compressImageWithSizeReduction(inputImagePath, outputImagePath, quality, reductionPercentage) {
  // Read the input image
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
  inputMatrixR = downsample8x8(inputMatrixR,quality);
  inputMatrixG = downsample8x8(inputMatrixG,quality);
  inputMatrixB = downsample8x8(inputMatrixB,quality);
  // Perform DCT-II on each color channel matrix
  let compressedMatrixR = dct2(inputMatrixR);
  let compressedMatrixG = dct2(inputMatrixG);
  let compressedMatrixB = dct2(inputMatrixB);

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
  let outputMatrixR = idct2(compressedMatrixR);
  let outputMatrixG = idct2(compressedMatrixG);
  let outputMatrixB = idct2(compressedMatrixB);

  // Upsample to original size
  
  outputMatrixR = upsample8x8(outputMatrixR, widthIn, heightIn,8-(quality/50));
  outputMatrixG = upsample8x8(outputMatrixG, widthIn, heightIn,8-(quality/50));
  outputMatrixB = upsample8x8(outputMatrixB, widthIn, heightIn,8-(quality/50));


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
  fs.writeFileSync(outputImagePath, jpegDataOut.data);
}