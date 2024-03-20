
# ImageSqueeze: Google Chrome Extension for Image Compression : 
Welcome to ImageSqueeze, a Google Chrome extension designed to streamline image compression directly within your browser. Say goodbye to the hassle of visiting third-party websites for image compression – ImageSqueeze brings the power of compression tools right to your fingertips as you browse the web.

## Overview : 
ImageSqueeze is a project developed between September 2023 and October 2023, employing React.js, Node.js, and Tailwind CSS to deliver a seamless user experience. Its primary goal is to simplify the process of image compression while maintaining quality and reducing file sizes.

## Key Features :
 - On-the-Fly Compression: With ImageSqueeze, compressing images is a breeze. The extension works in real-time, allowing users to compress images directly while browsing the web.
 - DCT Algorithm Integration: Leveraging the Discrete Cosine Transform (DCT) algorithm for JPEG compression, ImageSqueeze achieves impressive results by reducing image sizes by up to 75% without sacrificing quality.
 - Efficient Processing: ImageSqueeze incorporates multi-threading via Node.js workers, optimizing compression time and significantly improving processing speed. This ensures a smooth and efficient compression experience for users.

## Install Instructions : 
- ``` git clone <repo name> ``` in your terminal to clone the repo.
- ```cd client``` to get into client directory
- ```npm install ``` to download necessary node modules
- ```npm run build ``` to build the chrome extension and a dist folder should appear in the working directory
- Place this dist folder inside adding your own chrome extension after enabling developer mode in the browser.
- ``` cd server ``` to start the server
- ``` npm install ``` to install necessary node modules for the server
- ```npm start ``` to start the server and listen for the requests from the chrome extension we just installed and returning the compressed image

## Screenshots : 
