import { useState } from 'react';

function Backup() {
  const [compressionValue, setCompressionValue] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [compressedImage, setCompressedImage] = useState(null);

  const handleSliderChange = (event) => {
    const newValue = event.target.value;
    setCompressionValue(newValue);
  };

  const handleFileInput = (event) => {
    const file = event.target.files[0];

    if (file && file.type === 'image/jpeg') {
      uploadImage(file);
    } else {
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
        setUploadedImage(URL.createObjectURL(imageFile));
        setCompressedImage(`data:image/jpeg;base64,${result.compressedImage}`);
      } else {
        console.error('Error uploading and compressing image');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="w-96 h-96 bg-gray-900 flex flex-wrap justify-center">
      <div
        className="m-5 w-screen sm:w-auto flex-col justify-end"
        onDragOver={(event) => event.preventDefault()}
      >
        <h1 className="text-green-400 text-2xl">Compress your images</h1>
        <div className="m-2">
          <label htmlFor="default-range" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Compression Quality : {compressionValue}%
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
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark-hover-bg-gray-600"
          >
            {uploadedImage ? (
              <img src={uploadedImage} alt="Uploaded" />
            ) : (
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG</p>
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </>
            )}
          </label>
        </div>
      </div>
      {compressedImage && (
        <div className="m-5">
          <h2 className="text-green-400 text-xl">Compressed Image</h2>
          <img src={compressedImage} alt="Compressed" />
        </div>
      )}
    </div>
  );
}

export default Backup;
