# Hand Gesture Recognition Web App

A complete browser-based hand gesture recognition system using TensorFlow.js and MediaPipe.

## Features

- **Data Collection**: Capture hand gesture samples through your webcam
- **Model Training**: Train a neural network model directly in the browser
- **Real-time Recognition**: Test your trained model with live webcam feed
- **No Server Required**: Everything runs locally in your browser

## How to Use

1. Open `index.html` in a modern web browser (Chrome recommended)
2. Allow camera access when prompted
3. Use the tabs to navigate between different functionalities:

### Collect Data Tab
- Enter a gesture name (e.g., "thumbs_up")
- Set the number of samples to collect
- Click "Start Collection" and perform the gesture in front of your camera
- Click "Save Data" when done

### Train Model Tab
- Click "Train Model" to train a neural network on your collected data
- Monitor training progress in real-time
- Save or download the trained model when training completes

### Test Live Tab
- Load a trained model (if not already loaded)
- Click "Start Detection" to begin real-time gesture recognition
- Perform gestures in front of your camera to see them recognized

## Technical Details

This application uses:
- [TensorFlow.js](https://www.tensorflow.org/js) for machine learning in the browser
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) for hand landmark detection
- Vanilla JavaScript for application logic
- Browser's localStorage for data persistence
- IndexedDB for model storage

## Hosting on GitHub Pages

1. Create a new repository on GitHub
2. Upload all files to the repository
3. Go to repository Settings > Pages
4. Select the main branch as the source
5. Your site will be published at `https://[username].github.io/[repository-name]`

## Browser Compatibility

This application works best in:
- Chrome (recommended)
- Firefox
- Edge

Safari may have limited compatibility due to its stricter privacy policies.

## Limitations

- Model training happens in the browser, which may be slow for large datasets
- The neural network is relatively simple for browser compatibility
- Accuracy depends on the quality and quantity of training data

## Future Enhancements

- Add more model architecture options
- Implement data augmentation techniques
- Add support for exporting/importing datasets
- Add gesture sequence recognition
- Improve UI with gesture visualization during data collection