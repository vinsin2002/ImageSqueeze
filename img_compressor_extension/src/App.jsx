import React, { useState } from 'react';
import Loader from './Loader';

function App() {
  const [compressionValue, setCompressionValue] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [compressedImageURL, setCompressedImageURL] = useState(null);
  const [sizeReductionKB, setSizeReductionKB] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderChange = (event) => {
    const newValue = event.target.value;
    setCompressionValue(newValue);
  };

  const handleFileInput = async (file) => {
    setLoading(true);
    if (file && file.type === 'image/jpeg') {
      setUploadedImage(URL.createObjectURL(file));
      const { compressedImageURL, sizeReductionKB } = await uploadImage(file);
      setCompressedImageURL(compressedImageURL);
      setSizeReductionKB(sizeReductionKB);
    } else {
      setLoading(false);
      alert('Please select a valid JPEG image file.');
    }
  };

  const uploadImage = async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('compressionValue', compressionValue);

    try {
      const response = await fetch('http://localhost:3000/compress-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const compressedDataURL = `data:image/jpeg;base64,${result.compressedImage}`;
        // Create a Blob from the data URL
        const blob = await fetch(compressedDataURL).then((res) => res.blob());
        const compressedImageURL = URL.createObjectURL(blob);
        setLoading(false);
        // Calculate the size reduction in KB
        const originalSizeKB = imageFile.size / 1024;
        const compressedSizeKB = blob.size / 1024;
        const sizeReductionKB = originalSizeKB - compressedSizeKB;

        return { compressedImageURL, sizeReductionKB };
      } else {
        console.error('Error uploading and compressing image');
        return { compressedImageURL: null, sizeReductionKB: 0 };
      }
    } catch (error) {
      console.error('Error:', error);
      return { compressedImageURL: null, sizeReductionKB: 0 };
    }
  };

  const handleDownload = () => {
    if (compressedImageURL) {
      const a = document.createElement('a');
      a.href = compressedImageURL;
      a.download = 'compressed_image.jpg';
      a.click();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    handleFileInput(file);
  };

  return (
    <div className="w-96 h-96 bg-gray-900 flex flex-wrap justify-center">
      {loading ? (
        <Loader />
      ) : compressedImageURL ? (
        <div className="flex flex-col justify-center items-center">
          <h2 className="text-green-400 text-xl p-5">Compressed Image</h2>
          <img src={compressedImageURL} className="h-44" alt="Compressed" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Size Reduced By: {sizeReductionKB.toFixed(2)} KB
          </p>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
            onClick={handleDownload}
          >
            Download Compressed Image
          </button>
        </div>
      ) : (
        <div
          className={`m-5 w-screen sm:w-auto flex-col justify-end ${
            isDragging ? 'dragging' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <h1 className="text-green-400 text-2xl">Compress your images</h1>
          <div className="m-2">
            <label
              htmlFor="default-range"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Compression Factor : {compressionValue}
            </label>
            <input
              id="default-range"
              type="range"
              min="0"
              max="100"
              defaultValue="0"
              step="1"
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer dark-bg-gray-700"
              onChange={handleSliderChange}
            />
          </div>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-700 dark:hover-bg-gray-500 dark-bg-gray-700 hover-bg-gray-500 dark:border-gray-600 dark:hover-border-gray-500 dark-hover-bg-gray-600"
            >
              {(
                <>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      ></path>
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">JPEG</p>
                  </div>
                  <input
                    id="dropzone-file"
                    type="file"
                    className="hidden"
                    onChange={(event) => handleFileInput(event.target.files[0])}
                  />
                </>
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
