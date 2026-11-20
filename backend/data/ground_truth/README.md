# Ground truth for SmartHerd accuracy

No public goat dataset pairs photos with scale weights, so the error figure comes from the team's own measurements.
Each row of `measurements.csv` is one goat, measured once, all on the same day.

## Per goat

1. Tag ID and growth stage (`young`, `grower` or `adult`).
2. Scale weight in kg, the same day as the photos.
3. Tape heart girth (around the chest just behind the front legs) and tape body length (point of shoulder to pin bone), in cm.
4. One side photo and one top photo with the phone, whole goat in frame, photo sharp.
5. Both camera-to-goat distances measured with a tape, not guessed: side = phone to the goat's flank, top = phone to the goat's back.
6. The goat standing square on level ground, head up, not mid-step.

Put the photos in `photos/` next to the CSV and write their paths relative to this folder.

## CSV columns

`goat_id,stage,side_img,top_img,side_dist_cm,top_dist_cm,scale_kg,tape_girth_cm,tape_length_cm`

Tape columns may be left empty; weight error is still reported, girth and length error only where tape values exist.

## How many

Target 30 or more goats per stage. 10 per stage is the minimum for `--fit`; stages with fewer keep the identity correction.

## Run (from `smartherd\`)

```
..\.venv\Scripts\python.exe evaluate.py ..\data\ground_truth\measurements.csv
..\.venv\Scripts\python.exe evaluate.py ..\data\ground_truth\measurements.csv --fit
```

The first prints n, weight MAE (kg) and mean absolute percentage error per stage and overall, plus girth and length MAE.
`--fit` also writes the per-stage Huber correction to `smartherd/huber.json`. Report errors from goats that were not used for the fit.
