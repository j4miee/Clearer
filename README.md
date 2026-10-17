# Clearspace

Clearspace is now developed as a native Expo app. The separate React web app and mockup sandbox have been removed from this checkout.

## The app

The iPhone app lives in [`artifacts/clearspace-photos`](artifacts/clearspace-photos). Its photo review works with the iPhone photo library on the device. File review opens Apple’s system Files picker and only shows files the user selects; Clearspace cannot scan the whole Files app.

Photos marked for removal stay in the in-app **Clearspace Bin** until the user chooses **Review delete**. They can be restored from the bin first. Deletion then uses the iPhone’s own confirmation prompt.

## Run it on an iPhone

This project uses Expo SDK 57. The current App Store version of Expo Go supports projects through SDK 54, so use a local iOS development build for this project:

1. On the Mac, install and open Xcode once, then add your Apple Account in **Xcode → Settings → Accounts**.
2. Connect the unlocked iPhone to the Mac and tap **Trust This Computer** if prompted.
3. From the repository folder, run:

   ```sh
   pnpm install
   pnpm --filter @workspace/clearspace-photos ios:device
   ```

4. Allow Xcode to sign the development app with your **Personal Team**. On the iPhone, allow Clearspace access to the photos you want to review.

Personal Team installs are for development and need to be rebuilt and reinstalled about every seven days. Apple Developer Program membership is not required for this local testing workflow. Xcode and a connected iPhone are required to build and install the app; a browser at `localhost:3001` is no longer the app.

## Start the Expo development server

To start Metro for an already installed development app:

```sh
pnpm --filter @workspace/clearspace-photos dev
```

Run this on the Mac and iPhone while they are on the same Wi-Fi network. The local iOS build command above is the first step when the app has not yet been installed on the phone.

## GitHub

Local edits do not update GitHub by themselves. They must be committed and pushed to `origin` before they appear in the repository online.
