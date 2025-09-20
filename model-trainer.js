// Model trainer for creating and training gesture recognition models
class ModelTrainer {
    constructor() {
        this.model = null;
        this.isTraining = false;
        this.labels = [];
    }

    // Create a new model architecture
    createModel(inputSize, numClasses) {
        const model = tf.sequential();
        
        // Input layer
        model.add(tf.layers.dense({
            inputShape: [inputSize],
            units: 64,
            activation: 'relu'
        }));
        
        // Hidden layers
        model.add(tf.layers.dense({
            units: 32,
            activation: 'relu'
        }));
        
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        
        // Output layer
        model.add(tf.layers.dense({
            units: numClasses,
            activation: 'softmax'
        }));
        
        // Compile the model
        model.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        
        this.model = model;
        return model;
    }

    // Train the model on the provided data
    async trainModel(xs, ys, epochs = 50, callback) {
        if (!this.model) {
            throw new Error('Model not created. Call createModel first.');
        }
        
        this.isTraining = true;
        
        try {
            const history = await this.model.fit(xs, ys, {
                epochs,
                batchSize: 16,
                validationSplit: 0.2,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        if (callback) {
                            callback(epoch, epochs, logs);
                        }
                    }
                }
            });
            
            this.isTraining = false;
            return history;
        } catch (error) {
            this.isTraining = false;
            throw error;
        }
    }

    // Predict a single sample
    predict(landmarks) {
        if (!this.model) {
            throw new Error('Model not trained. Train the model first.');
        }
        
        // Flatten landmarks
        const flattened = [];
        for (const landmark of landmarks) {
            flattened.push(landmark.x, landmark.y);
        }
        
        const tensor = tf.tensor2d([flattened]);
        const prediction = this.model.predict(tensor);
        const values = prediction.dataSync();
        tensor.dispose();
        prediction.dispose();
        
        return values;
    }

    // Save model to browser storage
    async saveModel() {
        if (!this.model) {
            throw new Error('No model to save');
        }
        
        const saveResult = await this.model.save('indexeddb://gesture-model');
        return saveResult;
    }

    // Load model from browser storage
    async loadModel() {
        try {
            this.model = await tf.loadLayersModel('indexeddb://gesture-model');
            return true;
        } catch (error) {
            console.error('Error loading model:', error);
            return false;
        }
    }

    // Export model for download
    async exportModel() {
        if (!this.model) {
            throw new Error('No model to export');
        }
        
        const saveResult = await this.model.save('downloads://gesture-model');
        return saveResult;
    }

    // Get model summary
    getModelSummary() {
        if (!this.model) {
            return 'No model available';
        }
        
        let summary = '';
        this.model.summary({
            printFn: (line) => {
                summary += line + '\n';
            }
        });
        
        return summary;
    }
}