// Data manager for handling gesture data collection and storage
class DataManager {
    constructor() {
        this.data = {};
        this.currentSamples = [];
        this.currentLabel = '';
        this.loadFromLocalStorage();
    }

    // Initialize data structure for a new label
    initLabel(label) {
        if (!this.data[label]) {
            this.data[label] = [];
        }
        this.currentLabel = label;
        this.currentSamples = [];
    }

    // Add a sample for the current label
    addSample(landmarks) {
        if (!this.currentLabel) return;
        
        // Flatten landmarks to [x1, y1, x2, y2, ...]
        const flattened = [];
        for (const landmark of landmarks) {
            flattened.push(landmark.x, landmark.y);
        }
        
        this.currentSamples.push(flattened);
        return this.currentSamples.length;
    }

    // Save collected samples to the dataset
    saveSamples() {
        if (!this.currentLabel || this.currentSamples.length === 0) return;
        
        this.data[this.currentLabel] = this.data[this.currentLabel].concat(this.currentSamples);
        this.currentSamples = [];
        this.saveToLocalStorage();
        return this.data[this.currentLabel].length;
    }

    // Get all data as arrays suitable for training
    getTrainingData() {
        const xs = [];
        const ys = [];
        let labelIndex = 0;
        
        for (const label in this.data) {
            for (const sample of this.data[label]) {
                xs.push(sample);
                ys.push(labelIndex);
            }
            labelIndex++;
        }
        
        return {
            xs: tf.tensor2d(xs),
            ys: tf.oneHot(tf.tensor1d(ys, 'int32'), Object.keys(this.data).length),
            labels: Object.keys(this.data)
        };
    }

    // Get summary of collected data
    getDataSummary() {
        const summary = {};
        let total = 0;
        
        for (const label in this.data) {
            summary[label] = this.data[label].length;
            total += summary[label];
        }
        
        return {
            summary,
            total,
            labels: Object.keys(this.data)
        };
    }

    // Save data to localStorage
    saveToLocalStorage() {
        localStorage.setItem('gestureData', JSON.stringify(this.data));
    }

    // Load data from localStorage
    loadFromLocalStorage() {
        const savedData = localStorage.getItem('gestureData');
        if (savedData) {
            this.data = JSON.parse(savedData);
        }
    }

    // Clear all data
    clearData() {
        this.data = {};
        this.currentSamples = [];
        this.currentLabel = '';
        localStorage.removeItem('gestureData');
    }

    // Export data as JSON
    exportData() {
        const dataStr = JSON.stringify(this.data);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'gesture-data.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Import data from JSON file
    importData(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                this.data = importedData;
                this.saveToLocalStorage();
                if (callback) callback(true, 'Data imported successfully');
            } catch (error) {
                if (callback) callback(false, 'Error parsing JSON file');
            }
        };
        reader.readAsText(file);
    }
}