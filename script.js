// Main application script
class HandGestureApp {
    constructor() {
        this.detector = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isDetecting = false;
        this.animationId = null;
        
        this.dataManager = new DataManager();
        this.modelTrainer = new ModelTrainer();
        
        this.currentTab = 'collect';
        this.initializeApp();
    }

    // Initialize the application
    async initializeApp() {
        // Set up tab navigation
        this.setupTabs();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize camera
        await this.setupCamera();
        
        // Initialize hand detector
        await this.initHandDetector();
        
        // Update data summary
        this.updateDataSummary();
    }

    // Set up tab navigation
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.getAttribute('data-tab');
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tab}-tab`).classList.add('active');
                
                this.currentTab = tab;
                
                // Stop any ongoing detection when switching tabs
                if (this.isDetecting) {
                    this.stopDetection();
                }
            });
        });
    }

    // Set up event listeners
    setupEventListeners() {
        // Data collection tab
        document.getElementById('startCollectBtn').addEventListener('click', () => this.startCollection());
        document.getElementById('stopCollectBtn').addEventListener('click', () => this.stopCollection());
        document.getElementById('saveDataBtn').addEventListener('click', () => this.saveCollectedData());
        
        // Training tab
        document.getElementById('trainModelBtn').addEventListener('click', () => this.trainModel());
        document.getElementById('loadModelBtn').addEventListener('click', () => this.loadModel());
        document.getElementById('downloadModelBtn').addEventListener('click', () => this.downloadModel());
        
        // Testing tab
        document.getElementById('startTestBtn').addEventListener('click', () => this.startTest());
        document.getElementById('stopTestBtn').addEventListener('click', () => this.stopTest());
    }

    // Set up the camera
    async setupCamera() {
        try {
            this.video = document.getElementById('video');
            this.testVideo = document.getElementById('testVideo');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            this.video.srcObject = stream;
            this.testVideo.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    // Set up canvas for drawing
                    this.canvas = document.getElementById('output');
                    this.ctx = this.canvas.getContext('2d');
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    
                    // Set up test canvas
                    this.testCanvas = document.getElementById('testOutput');
                    this.testCtx = this.testCanvas.getContext('2d');
                    this.testCanvas.width = this.testVideo.videoWidth;
                    this.testCanvas.height = this.testVideo.videoHeight;
                    
                    resolve();
                };
            });
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Cannot access camera. Please check permissions and try again.');
        }
    }

    // Initialize hand detector
    async initHandDetector() {
        try {
            const model = handPoseDetection.SupportedModels.MediaPipeHands;
            const detectorConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
                modelType: 'full'
            };
            
            this.detector = await handPoseDetection.createDetector(model, detectorConfig);
            console.log('Hand detector initialized');
        } catch (error) {
            console.error('Error initializing hand detector:', error);
            alert('Failed to initialize hand detection. Please try again later.');
        }
    }

    // Start data collection
    async startCollection() {
        const label = document.getElementById('gestureLabel').value.trim();
        const sampleCount = parseInt(document.getElementById('sampleCount').value);
        
        if (!label) {
            alert('Please enter a gesture label');
            return;
        }
        
        if (!this.detector) {
            alert('Hand detector not ready. Please wait a moment and try again.');
            return;
        }
        
        // Initialize data collection
        this.dataManager.initLabel(label);
        this.collectedSamples = 0;
        this.targetSamples = sampleCount;
        
        // Update UI
        document.getElementById('startCollectBtn').disabled = true;
        document.getElementById('stopCollectBtn').disabled = false;
        document.getElementById('saveDataBtn').disabled = true;
        
        // Start detection loop
        this.isDetecting = true;
        this.collectData();
    }

    // Stop data collection
    stopCollection() {
        this.isDetecting = false;
        
        // Update UI
        document.getElementById('startCollectBtn').disabled = false;
        document.getElementById('stopCollectBtn').disabled = true;
        document.getElementById('saveDataBtn').disabled = false;
        
        cancelAnimationFrame(this.animationId);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Data collection loop
    async collectData() {
        if (!this.isDetecting) return;
        
        try {
            // Estimate hands
            const hands = await this.detector.estimateHands(this.video);
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw video frame
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Process results
            if (hands.length > 0) {
                // Draw hand landmarks
                this.drawHands(hands, this.ctx);
                
                // Collect sample
                const count = this.dataManager.addSample(hands[0].keypoints);
                this.collectedSamples = count;
                
                // Update progress
                this.updateCollectionProgress();
                
                // Check if we've collected enough samples
                if (this.collectedSamples >= this.targetSamples) {
                    this.stopCollection();
                    alert(`Collected ${this.collectedSamples} samples for ${this.dataManager.currentLabel}`);
                }
            }
        } catch (error) {
            console.error('Error detecting hands:', error);
        }
        
        // Continue detection
        if (this.isDetecting) {
            this.animationId = requestAnimationFrame(() => this.collectData());
        }
    }

    // Update collection progress UI
    updateCollectionProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        const progress = (this.collectedSamples / this.targetSamples) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${this.collectedSamples}/${this.targetSamples} samples collected`;
    }

    // Save collected data
    saveCollectedData() {
        const count = this.dataManager.saveSamples();
        alert(`Saved ${count} samples for ${this.dataManager.currentLabel}`);
        this.updateDataSummary();
    }

    // Update data summary UI
    updateDataSummary() {
        const dataSummary = document.getElementById('dataSummary');
        const summary = this.dataManager.getDataSummary();
        
        if (summary.total === 0) {
            dataSummary.innerHTML = '<p>No data collected yet</p>';
            return;
        }
        
        let html = `<p>Total samples: ${summary.total}</p>`;
        html += '<ul>';
        
        for (const label in summary.summary) {
            html += `<li>${label}: ${summary.summary[label]} samples</li>`;
        }
        
        html += '</ul>';
        dataSummary.innerHTML = html;
    }

    // Draw hand landmarks on canvas
    drawHands(hands, ctx) {
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
            drawing.drawConnectors(
                ctx, hand.keypoints, handPoseDetection.util.getKeypointIndexBySide('MediaPipeHands'), 
                { color: '#00FF00', lineWidth: 4 }
            );
        }
    }

    // Train the model
    async trainModel() {
        const dataSummary = this.dataManager.getDataSummary();
        
        if (dataSummary.total < 10) {
            alert('Not enough data to train. Collect at least 10 samples across all gestures.');
            return;
        }
        
        if (dataSummary.labels.length < 2) {
            alert('Need at least 2 different gestures to train a model.');
            return;
        }
        
        try {
            // Get training data
            const { xs, ys, labels } = this.dataManager.getTrainingData();
            this.modelTrainer.labels = labels;
            
            // Create model
            this.modelTrainer.createModel(42, labels.length); // 21 landmarks * 2 (x,y) = 42 features
            
            // Update UI
            document.getElementById('trainModelBtn').disabled = true;
            document.getElementById('trainingStatus').textContent = 'Training started...';
            
            // Train model
            await this.modelTrainer.trainModel(xs, ys, 50, (epoch, totalEpochs, logs) => {
                // Update training progress
                const progress = (epoch / totalEpochs) * 100;
                document.getElementById('trainingProgressFill').style.width = `${progress}%`;
                document.getElementById('trainingStatus').textContent = 
                    `Epoch ${epoch}/${totalEpochs} - Loss: ${logs.loss.toFixed(4)}, Accuracy: ${logs.acc.toFixed(4)}`;
            });
            
            // Save model
            await this.modelTrainer.saveModel();
            
            // Update UI
            document.getElementById('trainingStatus').textContent = 'Training completed!';
            document.getElementById('loadModelBtn').disabled = false;
            document.getElementById('downloadModelBtn').disabled = false;
            document.getElementById('trainModelBtn').disabled = false;
            
            // Update model summary
            document.getElementById('modelSummary').textContent = 
                `Model trained on ${dataSummary.total} samples across ${dataSummary.labels.length} gestures.`;
                
            alert('Model trained successfully!');
            
            // Clean up tensors
            xs.dispose();
            ys.dispose();
        } catch (error) {
            console.error('Error training model:', error);
            document.getElementById('trainingStatus').textContent = 'Error during training';
            document.getElementById('trainModelBtn').disabled = false;
            alert('Error training model: ' + error.message);
        }
    }

    // Load trained model
    async loadModel() {
        try {
            const success = await this.modelTrainer.loadModel();
            
            if (success) {
                // Get labels from data manager
                const dataSummary = this.dataManager.getDataSummary();
                this.modelTrainer.labels = dataSummary.labels;
                
                alert('Model loaded successfully!');
                document.getElementById('modelSummary').textContent = 
                    `Model loaded with ${dataSummary.labels.length} gestures.`;
            } else {
                alert('No trained model found. Please train a model first.');
            }
        } catch (error) {
            console.error('Error loading model:', error);
            alert('Error loading model: ' + error.message);
        }
    }

    // Download model
    async downloadModel() {
        try {
            await this.modelTrainer.exportModel();
            alert('Model downloaded successfully!');
        } catch (error) {
            console.error('Error downloading model:', error);
            alert('Error downloading model: ' + error.message);
        }
    }

    // Start live testing
    async startTest() {
        if (!this.modelTrainer.model) {
            alert('No model available. Please train or load a model first.');
            return;
        }
        
        if (!this.detector) {
            alert('Hand detector not ready. Please wait a moment and try again.');
            return;
        }
        
        // Update UI
        document.getElementById('startTestBtn').disabled = true;
        document.getElementById('stopTestBtn').disabled = false;
        
        // Start detection loop
        this.isDetecting = true;
        this.testDetection();
    }

    // Stop live testing
    stopTest() {
        this.isDetecting = false;
        
        // Update UI
        document.getElementById('startTestBtn').disabled = false;
        document.getElementById('stopTestBtn').disabled = true;
        
        cancelAnimationFrame(this.animationId);
        
        // Clear canvas
        this.testCtx.clearRect(0, 0, this.testCanvas.width, this.testCanvas.height);
        
        // Clear results
        document.getElementById('results').innerHTML = '<p class="placeholder">Detection stopped</p>';
        document.getElementById('confidenceContainer').innerHTML = '';
    }

    // Test detection loop
    async testDetection() {
        if (!this.isDetecting) return;
        
        try {
            // Estimate hands
            const hands = await this.detector.estimateHands(this.testVideo);
            
            // Clear canvas
            this.testCtx.clearRect(0, 0, this.testCanvas.width, this.testCanvas.height);
            
            // Draw video frame
            this.testCtx.drawImage(this.testVideo, 0, 0, this.testCanvas.width, this.testCanvas.height);
            
            // Process results
            if (hands.length > 0) {
                // Draw hand landmarks
                this.drawHands(hands, this.testCtx);
                
                // Predict gesture
                const predictions = this.modelTrainer.predict(hands[0].keypoints);
                this.displayPredictions(predictions);
            } else {
                document.getElementById('results').innerHTML = '<p>No hands detected</p>';
                document.getElementById('confidenceContainer').innerHTML = '';
            }
        } catch (error) {
            console.error('Error detecting hands:', error);
        }
        
        // Continue detection
        if (this.isDetecting) {
            this.animationId = requestAnimationFrame(() => this.testDetection());
        }
    }

    // Display prediction results
    displayPredictions(predictions) {
        const resultsDiv = document.getElementById('results');
        const confidenceContainer = document.getElementById('confidenceContainer');
        
        // Find the highest confidence prediction
        let maxConfidence = 0;
        let predictedLabel = '';
        let predictedIndex = -1;
        
        for (let i = 0; i < predictions.length; i++) {
            if (predictions[i] > maxConfidence) {
                maxConfidence = predictions[i];
                predictedLabel = this.modelTrainer.labels[i];
                predictedIndex = i;
            }
        }
        
        // Display the main result
        if (maxConfidence > 0.5) {
            resultsDiv.innerHTML = `
                <h3>Detected: ${predictedLabel}</h3>
                <p>Confidence: ${(maxConfidence * 100).toFixed(2)}%</p>
            `;
        } else {
            resultsDiv.innerHTML = `
                <p>Uncertain prediction</p>
                <p>Highest confidence: ${(maxConfidence * 100).toFixed(2)}%</p>
            `;
        }
        
        // Display confidence bars for all classes
        confidenceContainer.innerHTML = '';
        for (let i = 0; i < predictions.length; i++) {
            const confidence = predictions[i];
            const label = this.modelTrainer.labels[i];
            
            const barDiv = document.createElement('div');
            barDiv.className = 'confidence-bar';
            
            barDiv.innerHTML = `
                <div class="confidence-label">
                    <span>${label}</span>
                    <span class="confidence-value">${(confidence * 100).toFixed(2)}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${confidence * 100}%"></div>
                </div>
            `;
            
            confidenceContainer.appendChild(barDiv);
        }
    }
}

// Initialize the application when the page loads
window.addEventListener('load', () => {
    new HandGestureApp();
});