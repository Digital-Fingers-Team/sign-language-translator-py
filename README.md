# Hand Gesture Recognition Web App

A browser-based hand gesture recognition system using TensorFlow.js and MediaPipe.

## Features

- Real-time hand detection using webcam
- Visualization of hand landmarks
- Simple and intuitive interface
- Responsive design that works on desktop and mobile devices

## How to Use

1. Open `index.html` in a web browser (Chrome recommended)
2. Allow camera access when prompted
3. Click "Start Detection" to begin hand tracking
4. Show your hand to the camera to see the detection results
5. Click "Stop Detection" to end the tracking

## Technical Details

This application uses:
- [TensorFlow.js](https://www.tensorflow.org/js) for machine learning in the browser
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) for hand landmark detection
- Vanilla JavaScript for application logic

## Hosting on GitHub Pages

1. Create a new repository on GitHub
2. Upload all files to the repository
3. Go to repository Settings > Pages
4. Select the main branch as the source
5. Your site will be published at `https://[username].github.io/[repository-name]`

## Limitations

- This is a demonstration version showing hand detection but not gesture classification
- For full gesture recognition, you would need to train a model on specific gesture data
- Performance may vary based on device capabilities and camera quality

## Future Enhancements

- Add gesture classification with a trained model
- Implement data collection for custom gestures
- Add training interface in the browser
- Support for multiple gesture recognition