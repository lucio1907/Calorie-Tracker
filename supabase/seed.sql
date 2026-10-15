-- Shared activity catalog (owner_id null).
-- MET values and codes from the 2024 Adult Compendium of Physical Activities
-- (Herrmann et al., J Sport Health Sci 2024;13(1):6-12; pacompendium.com).
-- Speeds converted from mph to km/h and rounded for display.
-- No food data is seeded on purpose: the food catalog is imported separately.

insert into public.activities (owner_id, name, met, category, compendium_code)
values
  -- Walking & hiking
  (null, 'Walking, leisure', 3.5, 'walking', '17160'),
  (null, 'Walking, moderate pace (4.5-5.5 km/h)', 3.8, 'walking', '17190'),
  (null, 'Walking, brisk (5.6-6.3 km/h)', 4.8, 'walking', '17200'),
  (null, 'Hiking, normal pace, no load', 5.3, 'walking', '17082'),
  (null, 'Stair climbing, general', 6.8, 'walking', '17131'),
  -- Running
  (null, 'Jogging, self-selected pace', 7.5, 'running', '12020'),
  (null, 'Running, 8 km/h', 8.5, 'running', '12030'),
  (null, 'Running, 10 km/h', 9.3, 'running', '12050'),
  (null, 'Running, 11 km/h', 11.0, 'running', '12070'),
  (null, 'Running, 13 km/h', 12.0, 'running', '12090'),
  -- Cycling
  (null, 'Cycling, easy pace', 4.3, 'cycling', '01015'),
  (null, 'Cycling, moderate pace', 7.0, 'cycling', '01016'),
  (null, 'Stationary bike, general', 6.8, 'cycling', '01200'),
  (null, 'Spinning class', 9.0, 'cycling', '01270'),
  -- Gym & conditioning
  (null, 'Weight training, multiple exercises', 3.5, 'gym', '02054'),
  (null, 'Weight training, vigorous (powerlifting, bodybuilding)', 6.0, 'gym', '02050'),
  (null, 'Circuit training, vigorous', 7.5, 'gym', '02040'),
  (null, 'HIIT, vigorous (burpees, Tabata)', 11.0, 'gym', '02214'),
  (null, 'Elliptical trainer, moderate', 5.0, 'gym', '02048'),
  (null, 'Rowing machine, moderate', 5.0, 'gym', '02071'),
  (null, 'Yoga, general', 2.3, 'gym', '02175'),
  (null, 'Pilates, general', 2.8, 'gym', '02105'),
  -- Sports
  (null, 'Football (soccer), casual', 7.0, 'sports', '15610'),
  (null, 'Football (soccer), competitive', 9.5, 'sports', '15605'),
  (null, 'Basketball, general', 7.5, 'sports', '15055'),
  (null, 'Tennis, general', 6.8, 'sports', '15675'),
  (null, 'Volleyball, general', 4.0, 'sports', '15710'),
  -- Swimming
  (null, 'Swimming laps, freestyle, slow', 5.8, 'swimming', '18240'),
  (null, 'Swimming, leisure', 6.0, 'swimming', '18310'),
  -- Dance
  (null, 'Zumba class', 6.5, 'dance', '02310');
