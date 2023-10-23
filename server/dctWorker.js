const { workerData, parentPort } = require('worker_threads');

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

// Entry point for the worker
const { inputMatrix } = workerData;
const resultMatrix = dct2(inputMatrix);

// Send the computed DCT matrix back to the main thread
parentPort.postMessage({ status: 'success', resultMatrix });
