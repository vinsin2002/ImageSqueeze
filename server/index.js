const express = require('express');
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
  const compressionValue = req.body.compressionValue + 50;
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

    compressImageWithSizeReduction(inputImagePath, outputImagePath, reductionPercentage);

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

// The rest of your image compression functions
// ...

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
  function compressImageWithSizeReduction(inputImagePath, outputImagePath, quality) {
    // Read the input image
    try{
    console.log("image came");
    let reductionPercentage = 0;
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
    const inputMatrixR = [];
    const inputMatrixG = [];
    const inputMatrixB = [];
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
  
    // Perform DCT-II on each color channel matrix
    let compressedMatrixR = dct2(inputMatrixR);
    let compressedMatrixG = dct2(inputMatrixG);
    let compressedMatrixB = dct2(inputMatrixB);
  
    // Discard high frequency coefficients based on the quality parameter
    compressedMatrixR.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if ((rowIndex + colIndex) >= quality) {
          compressedMatrixR[rowIndex][colIndex] = 0;
        }
      });
    });
    compressedMatrixG.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if ((rowIndex + colIndex) >= quality) {
          compressedMatrixG[rowIndex][colIndex] = 0;
        }
      });
    });
    compressedMatrixB.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if ((rowIndex + colIndex) >= quality) {
          compressedMatrixB[rowIndex][colIndex] = 0;
        }
      });
    });
  
    // Perform IDCT-II on each compressed color channel matrix
    let outputMatrixR = idct2(compressedMatrixR);
    let outputMatrixG = idct2(compressedMatrixG);
    let outputMatrixB = idct2(compressedMatrixB);
  
    // Convert the output matrices to raw image data
    let widthOut, heightOut, dataOut;
    widthOut = newWidth;
    heightOut = newHeight;
    dataOut = Buffer.alloc(widthOut * heightOut * 4);
    outputMatrixR.forEach((rowOut, rowIndex) => {
      rowOut.forEach((value, colIndex) => {
        // Clamp the pixel value to [0, 255]
        const rValue = Math.max(0, Math.min(255, Math.round(outputMatrixR[rowIndex][colIndex])));
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
    console.log('Image compressed successfully.');
  } catch (error) {
    console.error('Error compressing image:', error);
  }}