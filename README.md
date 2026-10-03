# Pest & Disease Detection App

This is a React Native application that performs on-device pest and disease detection using a TensorFlow Lite (TFLite) model. The app supports on-device inference without requiring a network connection.

The User Interface (UI) is fully localized in **Kannada**.

## Features

- **On-Device Inference**: Uses `react-native-fast-tflite` to run the model locally. No data is sent to the cloud.
- **Fast Execution**: Accelerated processing using native modules without Expo wrappers. 
- **Kannada UI**: Instructions and interface labels are completely available in Kannada.
- **Direct APK Build**: The project has been configured to build directly as a native Android app (APK).

## Technologies Used

- **React Native**
- **react-native-fast-tflite**: High-performance module for loading and running TFLite models.
- **react-native-vision-camera**: For capturing images directly from the device's camera.
- **TensorFlow Lite**: On-device machine learning inference framework.

## Project Setup & Build Instructions

### Prerequisites

Ensure you have the following installed:
- Node.js
- JDK 17 (Required for Android build compilation)
- Android Studio / Android SDK

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Android Build

To run on an emulator or connected device:

```bash
npx react-native run-android
```

### 3. Generate Release APK

To build a standalone release APK:

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`
