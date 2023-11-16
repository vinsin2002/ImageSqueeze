const { Worker, workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const jpeg = require('jpeg-js');
function downsample8x8(matrix, compressionFactor) {
  const downsampledMatrix = [];

  const numRows = matrix.length;
  const numCols = matrix[0].length;

  // Adjust block size based on compression factor
  const blockSize = Math.ceil(8 - (compressionFactor / 50));

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
      const average = Math.ceil(sum / count);

      // Save the average value for the dynamically determined block
      rowInOutput.push(average);
    }

    // Push the row for the output matrix
    downsampledMatrix.push(rowInOutput);
  }

  return downsampledMatrix;
}

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
function encodeImage(inputImagePath, outputImagePath, quality) {
  try {
    // Read the input image
    const jpegDataIn = fs.readFileSync(inputImagePath);
    const rawImageDataIn = jpeg.decode(jpegDataIn);

    // Your image processing logic here (e.g., apply 4:2:0 chroma subsampling)
    // ...

    // Convert the modified raw image data to separate color channel matrices
    // ...

    // Perform DCT-II on each color channel matrix using a worker
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
    const newWidth = widthIn;
    const newHeight = heightIn;
  
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
    inputMatrixR = downsample8x8(inputMatrixR,quality);
    inputMatrixG = downsample8x8(inputMatrixG,quality);
    inputMatrixB = downsample8x8(inputMatrixB,quality);
    const dctWorkerR = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixR } });
    const dctWorkerG = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixG } });
    const dctWorkerB = new Worker('./dctWorker.js', { workerData: { inputMatrix: inputMatrixB } });

    Promise.all([
      new Promise((resolve) => dctWorkerR.on('message', resolve)),
      new Promise((resolve) => dctWorkerG.on('message', resolve)),
      new Promise((resolve) => dctWorkerB.on('message', resolve)),
    ]).then(([resultR, resultG, resultB]) => {
      let compressedMatrixR = resultR.resultMatrix;
      let compressedMatrixG = resultG.resultMatrix;
      let compressedMatrixB = resultB.resultMatrix;
      // Discard high frequency coefficients based on the quality parameter
      // ...
      const thresholdR = quality * 0.01; // Adjust this factor as needed
    const thresholdG = quality * 0.01; // Adjust this factor as needed
    const thresholdB = quality * 0.01; // Adjust this factor as needed

    compressedMatrixR = compressedMatrixR.map(row => row.map(val => (Math.abs(val) > thresholdR) ? val : 0));
    compressedMatrixG = compressedMatrixG.map(row => row.map(val => (Math.abs(val) > thresholdG) ? val : 0));
    compressedMatrixB = compressedMatrixB.map(row => row.map(val => (Math.abs(val) > thresholdB) ? val : 0));
    // Perform IDCT-II on each compressed color channel matrix
      // Perform IDCT-II on each compressed color channel matrix using a worker
      const idctWorkerR = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixR } });
      const idctWorkerG = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixG } });
      const idctWorkerB = new Worker('./idctWorker.js', { workerData: { inputMatrix: compressedMatrixB } });

      Promise.all([
        new Promise((resolve) => idctWorkerR.on('message', resolve)),
        new Promise((resolve) => idctWorkerG.on('message', resolve)),
        new Promise((resolve) => idctWorkerB.on('message', resolve)),
      ]).then(([resultR, resultG, resultB]) => {
        let outputMatrixR = resultR.resultMatrix;
        let outputMatrixG = resultG.resultMatrix;
        let outputMatrixB = resultB.resultMatrix;

        outputMatrixR = upsample8x8(outputMatrixR, widthIn, heightIn,8-(quality/50));
        outputMatrixG = upsample8x8(outputMatrixG, widthIn, heightIn,8-(quality/50));
        outputMatrixB = upsample8x8(outputMatrixB, widthIn, heightIn,8-(quality/50));

        // Convert the output matrices to raw image data
        // ...

        // Encode the raw image data as JPEG
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
    const encodedData = jpeg.encode(rawImageDataOut);

    // Write the output image
    fs.writeFileSync(outputImagePath, encodedData.data);

    parentPort.postMessage({ status: 'success' });
      });
    });
  } catch (error) {
    parentPort.postMessage({ status: 'error', error: error.message });
  }
}

// Entry point for the worker
const { inputImagePath, outputImagePath, quality } = workerData;
encodeImage(inputImagePath, outputImagePath, quality);
