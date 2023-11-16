// downsampleWorker.js
const { parentPort, workerData } = require('worker_threads');

function downsample8x8(matrix, compressionFactor) {
  // Your existing downsample8x8 logic here
  // ...
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
  // For demonstration, sending the result back to the main thread
  parentPort.postMessage(downsampledMatrix);
}

// Listen for messages from the main thread
parentPort.on('message', (message) => {
  if (message.type === 'downsample') {
    downsample8x8(message.matrix, message.compressionFactor);
  }
});
