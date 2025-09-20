// Global variables
let video;
let canvas;
let ctx;
let detector;
let isDetecting = false;
let animationId;

// Initialize the application
async function init() {
    video = document.getElementById('video');
    canvas = document.getElementById('output');
    ctx = canvas.getContext('2d');
    
    // Set up event listeners
    document.getElementById('startBtn').addEventListener('click', startDetection);
    document.getElementById('stopBtn').addEventListener('click', stopDetection);
    
    // Set up camera
    await setupCamera();
    
    // Initialize hand detector
    await initHandDetector();
    
    // Adjust canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}

// Set up the camera
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Cannot access camera. Please check permissions and try again.');
    }
}

// Initialize hand detector
async function initHandDetector() {
    try {
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig = {
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
            modelType: 'full'
        };
        
        detector = await handPoseDetection.createDetector(model, detectorConfig);
        console.log('Hand detector initialized');
    } catch (error) {
        console.error('Error initializing hand detector:', error);
        alert('Failed to initialize hand detection. Please try again later.');
    }
}

// Start hand detection
async function startDetection() {
    if (!detector) {
        alert('Hand detector not ready. Please wait a moment and try again.');
        return;
    }
    
    isDetecting = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    
    // Clear placeholder text
    document.querySelector('.placeholder').style.display = 'none';
    
    // Start detection loop
    detectHands();
}

// Stop hand detection
function stopDetection() {
    isDetecting = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    
    cancelAnimationFrame(animationId);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Show placeholder text
    document.querySelector('.placeholder').style.display = 'block';
    document.getElementById('results').innerHTML = '<p class="placeholder">Detection stopped</p>';
}

// Main detection loop
async function detectHands() {
    if (!isDetecting) return;
    
    try {
        // Estimate hands
        const hands = await detector.estimateHands(video, { flipHorizontal: true });
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Process results
        if (hands.length > 0) {
            // Draw hand landmarks
            drawHands(hands);
            
            // Display results
            displayResults(hands);
        } else {
            document.getElementById('results').innerHTML = '<p>No hands detected</p>';
        }
    } catch (error) {
        console.error('Error detecting hands:', error);
    }
    
    // Continue detection
    if (isDetecting) {
        animationId = requestAnimationFrame(detectHands);
    }
}

// Draw hand landmarks on canvas
function drawHands(hands) {
    for (const hand of hands) {
        // Draw keypoints
        for (const keypoint of hand.keypoints) {
            const { x, y } = keypoint;
            
            // Draw point
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        }
        
        // Draw connections
        if (hand.keypoints3D) {
            const connections = handPoseDetection.util.getKeypointIndexBySide(model);
            drawing.drawConnectors(
                ctx, hand.keypoints, connections, 
                { color: '#00FF00', lineWidth: 4 }
            );
        }
    }
}

// Display detection results
function displayResults(hands) {
    let resultsHTML = '';
    
    for (const hand of hands) {
        resultsHTML += `
            <div class="hand-result">
                <h3>Hand Detected</h3>
                <p>Handedness: ${hand.handedness}</p>
                <p>Keypoints: ${hand.keypoints.length}</p>
                <p>Confidence: ${Math.round(hand.score * 100)}%</p>
            </div>
        `;
    }
    
    document.getElementById('results').innerHTML = resultsHTML;
}

// Initialize when page loads
window.addEventListener('load', init);