# Running SmartHerd on a phone

The laptop is the server. It runs the pose models and stores the records. The phone reaches it either through a public tunnel (works on any network) or directly over the same Wi-Fi.

All commands are for **PowerShell**, run from the `backend` folder of the app repo unless stated.

## 1. Start the server (every time)

```powershell
.\start-server.ps1
```

It prints an **access code** and listens on port 8766. Keep this window open and the laptop awake. To reuse a code: `.\start-server.ps1 -Token mycode123`.

## 2a. Any phone, nothing to install (recommended for demos)

One-time setup:

```powershell
winget install --id Cloudflare.cloudflared
cd ..   # the app repo root
$env:EXPO_PUBLIC_API_URL='/'; npx expo export --platform web
```

Build the web app from PowerShell, not Git Bash: Git Bash rewrites `/` into a Windows path and the app then cannot find the server. Rebuild after any app code change.

Every time, in a second window:

```powershell
cloudflared tunnel --url http://localhost:8766
```

It prints an address like `https://something.trycloudflare.com`. Open it in the phone's browser, go to **Profile → SmartHerd server**, type the access code, and press **Save and test**. Leave the server address as it is.

Limits: the address changes every time the tunnel restarts; in the browser, photos of saved weighings are lost if the page is reloaded, so a capture saved for later must be synced before closing the tab.

## 2b. Android app (APK)

One-time, needs a free Expo account:

```powershell
cd ..   # the app repo root
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

Open the build link on the phone and install the APK. In **Profile → SmartHerd server** enter the server address (the tunnel address from 2a, or the Wi-Fi address from 2c) and the access code.

Not yet tried on a real Android phone: reading photos for upload and reading the lens value from the photo. Check these first.

## 2c. Same Wi-Fi, no internet

One-time, in an administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName "SmartHerd 8766" -Direction Inbound -Protocol TCP -LocalPort 8766 -Action Allow -Profile Private
```

The Wi-Fi network must be set to Private in Windows. Find the laptop's address with `ipconfig` (IPv4 Address). On the phone use `http://<that address>:8766` as the server address in the APK, or open it in the phone browser.

## iPhone

Use 2a. An installed iPhone app needs a paid Apple Developer account.

## Automatic distance (one-time)

If a distance is left empty, the server measures it from the photo with Apple Depth Pro (about 4 s per photo on the GPU). A typed distance always overrides it. Without this setup the server asks for the distance instead.

```powershell
.\.venv\Scripts\pip.exe install git+https://github.com/apple/ml-depth-pro.git
.\.venv\Scripts\pip.exe install "numpy>=2,<2.8"      # restore numpy 2; ignore pip's "depth-pro requires numpy<2" warning, it works
```

Download `depth_pro.pt` from Hugging Face `apple/DepthPro` into `checkpoints\` (so `checkpoints\depth_pro.pt`, 1.9 GB, not committed), then restart the server.

The depth is read over the goat's mask from our YOLOv8s-seg model `models\goat_seg.pt` (background excluded; not committed: retrain with the command at the top of `configs\seg.yaml`). Without it the depth falls back to the keypoints.

## Checks before a demo

```powershell
cd smartherd
..\.venv\Scripts\python.exe -m unittest test_cloud      # server tests
..\.venv\Scripts\python.exe run_demo.py                 # Pi simulator demo (run without an access code set)
```

## Measuring accuracy

Fill `data\ground_truth\measurements.csv` following `data\ground_truth\README.md`, then:

```powershell
cd smartherd
..\.venv\Scripts\python.exe evaluate.py ..\data\ground_truth\measurements.csv          # error per growth stage
..\.venv\Scripts\python.exe evaluate.py ..\data\ground_truth\measurements.csv --fit    # also fits the Huber correction
```
