import cv2
import numpy as np
import pandas as pd
import time
import joblib
import pyttsx3
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import mediapipe as mp

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)

# Global variables
CSV_FILE = 'hand_landmarks.csv'
MODEL_FILE = 'hand_model.joblib'

def append_row(label, coords):
    """Append a new row to the CSV file"""
    with open(CSV_FILE, 'a') as f:
        row = [label] + coords
        f.write(','.join(map(str, row)) + '\n')

def load_data():
    """Load data from CSV file"""
    try:
        df = pd.read_csv(CSV_FILE, header=None)
    except FileNotFoundError:
        # If file doesn't exist, create it with header
        columns = ['label'] + [f'{ax}{i}' for i in range(21) for ax in ['x', 'y']]
        df = pd.DataFrame(columns=columns)
        df.to_csv(CSV_FILE, index=False)
        return load_data()
    
    # If header row present, reload with header=0
    try:
        df2 = pd.read_csv(CSV_FILE)
        if 'label' in df2.columns or df2.shape[1] == 43:
            df = df2
    except Exception:
        pass

    # Normalize column names to predictable format
    # assume first column is label and the rest 42 coords
    if df.shape[1] < 2:
        raise ValueError('CSV format unexpected. Need label + 42 coords per row')

    labels = df.iloc[:,0].astype(str).values
    X = df.iloc[:,1:].astype(float).values
    return X, labels

def collect_data():
    """Collect hand landmark data for training"""
    label = input("Enter gesture label: ")
    target = int(input("How many samples to collect? "))
    cooldown = 0.5  # seconds between saves
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return
    
    collected = 0
    last_saved = 0
    
    print(f"Collecting {target} samples for '{label}'. Press 's' to save, 'q' to quit.")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break
            
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = hands.process(rgb)

        if res.multi_hand_landmarks:
            for handLms in res.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, handLms, mp_hands.HAND_CONNECTIONS)

            cv2.putText(frame, f'Detected. Press S to save ({collected}/{target})', (10,30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
        else:
            cv2.putText(frame, 'No hand detected', (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

        cv2.imshow('Collect Data', frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        if key == ord('s') and res.multi_hand_landmarks:
            now = time.time()
            if now - last_saved < cooldown:
                continue
            handLms = res.multi_hand_landmarks[0]
            # flatten to x0,y0,x1,y1...
            coords = []
            for lm in handLms.landmark:
                coords.append(lm.x)
                coords.append(lm.y)
            if len(coords) == 42:
                append_row(label, coords)
                collected += 1
                last_saved = now
                print(f'saved sample {collected}/{target}')
            else:
                print('bad sample length, skipped')

        if collected >= target:
            print('target reached')
            break

    cap.release()
    cv2.destroyAllWindows()

def train_model():
    """Train a model on the collected data"""
    print('Loading data...')
    try:
        X, y = load_data()
    except Exception as e:
        print(f"Error loading data: {e}")
        return
        
    if len(X) == 0:
        print("No data found. Please collect data first.")
        return
        
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y_enc, test_size=0.2, random_state=42)

    print('Training RandomForest...')
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f'Accuracy on test set: {acc:.3f}')
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    print('Saving model to', MODEL_FILE)
    joblib.dump({'model': clf, 'le': le, 'scaler': scaler}, MODEL_FILE)
    print('Done.')

def test_live():
    """Test the trained model with live camera feed"""
    try:
        data = joblib.load(MODEL_FILE)
        model = data['model']
        le = data['le']
        scaler = data['scaler']
    except:
        print("Model not found. Please train a model first.")
        return
        
    # Initialize text-to-speech engine
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
    except:
        engine = None
        print("Text-to-speech not available")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return
        
    last_label = ""
    last_spoken = 0
    
    print("Press 'q' to quit live test")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break
            
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = hands.process(rgb)

        display_text = 'No hand'
        prob = 0.0

        if res.multi_hand_landmarks:
            handLms = res.multi_hand_landmarks[0]
            mp_drawing.draw_landmarks(frame, handLms, mp_hands.HAND_CONNECTIONS)
            coords = []
            for lm in handLms.landmark:
                coords.append(lm.x)
                coords.append(lm.y)
            X = np.array(coords).reshape(1, -1)
            Xs = scaler.transform(X)
            probs = None
            try:
                probs = model.predict_proba(Xs)[0]
                idx = np.argmax(probs)
                prob = probs[idx]
                pred = model.predict(Xs)[0]
            except Exception:
                # model without predict_proba
                pred = model.predict(Xs)[0]
                idx = pred
                prob = 1.0

            if hasattr(le, 'inverse_transform'):
                try:
                    label = le.inverse_transform([idx])[0]
                except Exception:
                    label = str(idx)
            else:
                label = str(idx)

            display_text = f'{label} ({prob:.2f})'

            # Speak when label changes and confidence is decent
            if engine and label != last_label and prob > 0.6 and time.time() - last_spoken > 1.2:
                engine.say(label)
                engine.runAndWait()
                last_spoken = time.time()
                last_label = label

        cv2.putText(frame, display_text, (10,50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255,255,0), 2)
        cv2.imshow('Live Test', frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

def main():
    """Main menu for the hand gesture recognition system"""
    while True:
        print("\nHand Gesture Recognition System")
        print("1. Collect Data")
        print("2. Train Model")
        print("3. Test Live")
        print("4. Exit")
        
        choice = input("Select an option (1-4): ")
        
        if choice == '1':
            collect_data()
        elif choice == '2':
            train_model()
        elif choice == '3':
            test_live()
        elif choice == '4':
            print("Exiting...")
            break
        else:
            print("Invalid option. Please try again.")

if __name__ == '__main__':
    main()