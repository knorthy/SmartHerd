# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users
Filipino goat farmers organised in cooperatives (e.g. a 10-member co-op) that co-own one shared SmartHerd unit. They weigh goats in the pen or barn, often with weak or no connectivity, to track growth and decide when an animal is ready for sale. Not aimed at solo backyard raisers.

## Product Purpose
SmartHerd estimates a goat's live weight from two photos (side view and top view) without a weighing scale and without restraining the animal. The app records each weighing against a goat so the cooperative can follow growth over time and spot goats nearing sale weight. Success: a member gets a trustworthy Estimated Weight in under a minute and the record is there next time.

## Positioning
Scale-free, restraint-free, offline weighing for a shared cooperative device. The mechanism is image measurement: segmentation and pose keypoints yield body length, chest height and chest width; heart girth follows from an ellipse approximation; Schaeffer's formula gives the weight.

## Operating Context
University final project (COSC 111A – Internet of Things, Cavite State University, Group 3). The physical device (Raspberry Pi 5, cameras, ToF sensors, touchscreen) is a proposal; the project is run as a simulation. This app represents that device GUI on a phone.

Weighing flow: choose or register a goat → set growth stage (young / grower / adult) → provide side and top images → camera-to-goat distance (simulated or entered) → result → save to the goat's record.

## Capabilities and Constraints
- Estimates are **simulated** in the app: plausible measurements per growth stage, weight computed with Schaeffer's formula `Weight (kg) = HeartGirth² × BodyLength / 10840` (cm). No model server.
- Data lives on the device; core weighing works fully offline.
- SmartHerd Sync is represented by a simple cooperative overview built from local data plus a sync-status display. No real cloud backend, no SMS.
- Ships on Android and iOS with **one shared custom look** (not per-OS styling). Expo SDK 58, Expo Router.
- Units: measurements always in centimetres, weight in kilograms.

## Brand Commitments
- Name: SmartHerd. On-device title in team reference: "Goat Weight Estimation System".
- Always "Estimated Weight", never "exact".
- Vocabulary: growth stage (young, grower, adult); Body Length, Chest Height, Chest Width, Heart Girth.
- Plural, cooperative framing: "your herd", "your cooperative's goats".
- User direction: formal and minimalist.

## Evidence on Hand
- Team reference screenshot of the result screen (described, not in repo): top/side image panels with zoom/rotate/pan, Estimated Weight headline, four measurements, Save Goat and Home actions.
- Project write-up `Grp-3-Main-Docs-Final-Project-3.md` (not in repo).
- No real goat photos, cooperative members, or field data. Any sample goats or records are synthetic and must be labelled as demo data.

## Product Principles
1. The estimate is honest: always labelled an estimate, with the measurements that produced it visible.
2. Works without signal; sync is a bonus, never a gate.
3. Built for a shared device and a group: records belong to the herd, not a single user.
4. Fast in the pen: few steps, large targets, readable outdoors.

## Accessibility & Inclusion
Used outdoors in bright light by farmers of varied ages and tech familiarity: high contrast, large touch targets, plain English copy.
