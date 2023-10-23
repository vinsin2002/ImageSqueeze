const { workerData, parentPort } = require('worker_threads');

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

// Entry point for the worker
const { inputMatrix } = workerData;
const resultMatrix = idct2(inputMatrix);

// Send the computed IDCT matrix back to the main thread
parentPort.postMessage({ status: 'success', resultMatrix });
