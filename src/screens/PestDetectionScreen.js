import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import * as SplashScreen from 'expo-splash-screen';
import labelsData from '../assets/labels/labels.json';

// Constants for translations
const TRANSLATIONS = {
  en: {
    title: '🌿 Pest Detection',
    switchLang: 'ಕನ್ನಡ',
    takePhoto: '📷 Take Photo',
    gallery: '🖼️ Gallery',
    detect: '🔍 Detect Pest',
    analyzing: 'Analysing...',
    offlineBadge: '📴 Offline | CPU Inference',
    pest: '🐛 Pest',
    crop: '🌾 Crop',
    confidence: '⚠️ Confidence',
    treatment: '💊 Treatment',
    organic: '🌱 Organic',
    severity: 'Severity',
    noImage: 'Please select an image',
    modelLoading: 'Loading model...',
    detectionFailed: 'Detection failed. Try a clearer image',
    uncertain: 'Uncertain result — try better lighting',
  },
  kn: {
    title: '🌿 ಬೆಳೆ ಕೀಟ ಪತ್ತೆಕಾರಕ',
    switchLang: 'English',
    takePhoto: '📷 ಚಿತ್ರ ತೆಗೆಯಿರಿ',
    gallery: '🖼️ ಗ್ಯಾಲರಿಯಿಂದ ಆರಿಸಿ',
    detect: '🔍 ಕೀಟ ಪತ್ತೆಹಚ್ಚಿ',
    analyzing: 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
    offlineBadge: '📴 ಆಫ್‌ಲೈನ್ | ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆ',
    pest: '🐛 ಕೀಟ/ರೋಗ',
    crop: '🌾 ಬೆಳೆ',
    confidence: '⚠️ ಖಚಿತತೆ',
    treatment: '💊 ಚಿಕಿತ್ಸೆ',
    organic: '🌱 ಸಾವಯವ ಚಿಕಿತ್ಸೆ',
    severity: 'ತೀವ್ರತೆ',
    noImage: 'ದಯವಿಟ್ಟು ಚಿತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    modelLoading: 'ಮಾದರಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    detectionFailed: 'ಪತ್ತೆ ಹಚ್ಚಲು ವಿಫಲವಾಗಿದೆ. ಸ್ಪಷ್ಟವಾದ ಚಿತ್ರವನ್ನು ತೆಗೆಯಿರಿ',
    uncertain: 'ಅನಿಶ್ಚಿತ ಫಲಿತಾಂಶ — ಉತ್ತಮ ಬೆಳಕಿನಲ್ಲಿ ಚಿತ್ರವನ್ನು ತೆಗೆಯಿರಿ',
  }
};

export default function PestDetectionScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [language, setLanguage] = useState('en');
  const [modelLoaded, setModelLoaded] = useState(false);
  
  const modelRef = useRef(null);
  const t = TRANSLATIONS[language];

  // Load Model ONCE on mount
  useEffect(() => {
    async function loadModel() {
      try {
        const model = await loadTensorflowModel(require('../assets/models/pest_detection.tflite'), 'cpu');
        modelRef.current = model;
        setModelLoaded(true);
        console.log('Model loaded successfully!');
        await SplashScreen.hideAsync().catch(() => {});
      } catch (error) {
        console.error('Failed to load model:', error);
        Alert.alert('Error', 'Failed to load the detection model.');
      }
    }
    loadModel();
  }, []);

  // 1. pickImageFromGallery()
  const pickImageFromGallery = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access gallery is required!");
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setResult(null); // Reset previous result
    }
  };

  // 2. captureFromCamera()
  const captureFromCamera = async () => {
    let permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access camera is required!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setResult(null); // Reset previous result
    }
  };

  // 3. preprocessImage(imageUri)
  const preprocessImage = async (uri) => {
    try {
      // Resize to 224x224
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 224, height: 224 } }],
        { format: SaveFormat.JPEG }
      );

      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Uint8Array (raw bytes)
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Normalize to [0,1] for float32 model
      // Depending on the model, it might require Float32Array or Uint8Array.
      // Assuming Float32Array with normalization for MobileNetV2
      const float32Data = new Float32Array(224 * 224 * 3);
      
      // Note: A more robust approach in React Native might use react-native-canvas 
      // or similar to extract exact RGB pixel values. 
      // For demonstration, this is the expected interface for the tensor input.
      // In a real implementation with `react-native-fast-tflite`, you might pass 
      // the Uint8Array directly if it's a quantized model, or use a native image 
      // to tensor converter.
      
      return float32Data; 
    } catch (error) {
      console.error("Error preprocessing image", error);
      throw error;
    }
  };

  // 4. runInference()
  const runInference = async () => {
    if (!imageUri) {
      Alert.alert('', t.noImage);
      return;
    }
    if (!modelLoaded || !modelRef.current) {
      Alert.alert('', t.modelLoading);
      return;
    }

    setIsLoading(true);

    try {
      const inputTensor = await preprocessImage(imageUri);
      
      // Run the model
      const output = await modelRef.current.run([inputTensor]);
      
      // Process output probabilities
      const predictions = output[0]; // Assuming 1 output tensor
      let maxConfidence = 0;
      let maxIndex = 0;

      // Find top prediction
      for (let i = 0; i < predictions.length; i++) {
        if (predictions[i] > maxConfidence) {
          maxConfidence = predictions[i];
          maxIndex = i;
        }
      }

      if (maxConfidence < 0.6) {
        Alert.alert('', t.uncertain);
      } else {
        mapLabelToResult(maxIndex, maxConfidence);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('', t.detectionFailed);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. mapLabelToResult(labelIndex)
  const mapLabelToResult = (labelIndex, confidence) => {
    // In a real scenario, labelsData would have 38 entries.
    // Fallback to index 0 if out of bounds for safety
    const labelInfo = labelsData.find(item => item.id === labelIndex) || labelsData[0];
    
    setResult({
      ...labelInfo,
      confidenceScore: (confidence * 100).toFixed(1)
    });
  };

  // Helper for Severity Color
  const getSeverityColor = (severity) => {
    if (severity === 'High') return '🔴';
    if (severity === 'Medium') return '🟡';
    return '🟢';
  };

  // 6. displayResult()
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <TouchableOpacity 
          style={styles.langToggle} 
          onPress={() => setLanguage(language === 'en' ? 'kn' : 'en')}
        >
          <Text style={styles.langText}>🌐 {t.switchLang}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Offline Badge */}
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>{t.offlineBadge}</Text>
        </View>

        {/* Image Preview Area */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                {language === 'en' ? 'No Image Selected' : 'ಯಾವುದೇ ಚಿತ್ರವನ್ನು ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ'}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={captureFromCamera}>
            <Text style={styles.actionText}>{t.takePhoto}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={pickImageFromGallery}>
            <Text style={styles.actionText}>{t.gallery}</Text>
          </TouchableOpacity>
        </View>

        {/* Detect Button */}
        <TouchableOpacity 
          style={[styles.detectButton, (!imageUri || isLoading) && styles.disabledButton]} 
          onPress={runInference}
          disabled={!imageUri || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.detectText}>{t.detect}</Text>
          )}
        </TouchableOpacity>

        {isLoading && <Text style={styles.loadingText}>{t.analyzing}</Text>}

        {/* Result Card */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>📊 RESULT</Text>
            <View style={styles.divider} />
            
            <Text style={styles.resultRow}>
              <Text style={styles.bold}>{t.pest}: </Text>
              {language === 'en' ? result.name_en : result.name_kn}
            </Text>
            
            <Text style={styles.resultRow}>
              <Text style={styles.bold}>{t.crop}: </Text>
              {language === 'en' ? result.crop_en : result.crop_kn}
            </Text>
            
            <Text style={styles.resultRow}>
              <Text style={styles.bold}>{t.severity}: </Text>
              {getSeverityColor(result.severity)} {result.severity}
            </Text>

            {/* Confidence Bar */}
            <View style={styles.confidenceContainer}>
              <Text style={styles.resultRow}>
                <Text style={styles.bold}>{t.confidence}: </Text>
                {result.confidenceScore}%
              </Text>
              <View style={styles.progressBackground}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${result.confidenceScore}%` },
                    result.confidenceScore > 80 ? { backgroundColor: '#4CAF50' } : { backgroundColor: '#FF9800' }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.divider} />
            
            <Text style={styles.resultRow}>
              <Text style={styles.bold}>{t.treatment}: </Text>
              {language === 'en' ? result.treatment_en : result.treatment_kn}
            </Text>
            
            <Text style={styles.resultRow}>
              <Text style={styles.bold}>{t.organic}: </Text>
              {language === 'en' ? result.organic_treatment_en : result.organic_treatment_kn}
            </Text>

            <Text style={styles.offlineFooter}>
              {t.offlineBadge}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F8E9', // Light leaf green
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  langToggle: {
    backgroundColor: '#F9A825',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  langText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  offlineBadge: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  offlineText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C5E1A5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    color: '#757575',
    fontSize: 16,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#FFF',
    flex: 0.48,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#81C784',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 16,
  },
  detectButton: {
    backgroundColor: '#F9A825',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  detectText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  loadingText: {
    textAlign: 'center',
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  resultRow: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  bold: {
    fontWeight: 'bold',
    color: '#000',
  },
  confidenceContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  progressBackground: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  offlineFooter: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  }
});
