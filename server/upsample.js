// downsampleWorker.js
const { parentPort, workerData } = require('worker_threads');
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
  
function upsample8x8(matrix,originalHeight,originalWidth,blockSize) {
    const upsampledMatrix = [];

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
  parentPort.postMessage(upsampledMatrix);
}

// Listen for messages from the main thread
parentPort.on('message', (message) => {
  if (message.type === 'upsample') {
    upsample8x8(message.matrix,message.originalHeight,message.originalWidth,message.blockSize);
  }
});
