-- Shared activity catalog (owner_id null).
-- MET values and codes from the 2024 Adult Compendium of Physical Activities
-- (Herrmann et al., J Sport Health Sci 2024;13(1):6-12; pacompendium.com).
-- Speeds converted from mph to km/h and rounded for display.
-- No food data is seeded on purpose: the food catalog is imported separately.

insert into public.activities (owner_id, name, met, category, compendium_code)
values
  -- Walking & hiking
  (null, 'Caminata, paseo', 3.5, 'walking', '17160'),
  (null, 'Caminata, ritmo moderado (4,5-5,5 km/h)', 3.8, 'walking', '17190'),
  (null, 'Caminata, ritmo rápido (5,6-6,3 km/h)', 4.8, 'walking', '17200'),
  (null, 'Senderismo, ritmo normal, sin carga', 5.3, 'walking', '17082'),
  (null, 'Subir escaleras, general', 6.8, 'walking', '17131'),
  -- Running
  (null, 'Trote, ritmo propio', 7.5, 'running', '12020'),
  (null, 'Correr, 8 km/h', 8.5, 'running', '12030'),
  (null, 'Correr, 10 km/h', 9.3, 'running', '12050'),
  (null, 'Correr, 11 km/h', 11.0, 'running', '12070'),
  (null, 'Correr, 13 km/h', 12.0, 'running', '12090'),
  -- Cycling
  (null, 'Ciclismo, ritmo suave', 4.3, 'cycling', '01015'),
  (null, 'Ciclismo, ritmo moderado', 7.0, 'cycling', '01016'),
  (null, 'Bicicleta fija, general', 6.8, 'cycling', '01200'),
  (null, 'Clase de spinning', 9.0, 'cycling', '01270'),
  -- Gym & conditioning
  (null, 'Pesas, varios ejercicios', 3.5, 'gym', '02054'),
  (null, 'Pesas, intenso (powerlifting, fisicoculturismo)', 6.0, 'gym', '02050'),
  (null, 'Entrenamiento en circuito, intenso', 7.5, 'gym', '02040'),
  (null, 'HIIT, intenso (burpees, Tabata)', 11.0, 'gym', '02214'),
  (null, 'Elíptico, moderado', 5.0, 'gym', '02048'),
  (null, 'Remo en máquina, moderado', 5.0, 'gym', '02071'),
  (null, 'Yoga, general', 2.3, 'gym', '02175'),
  (null, 'Pilates, general', 2.8, 'gym', '02105'),
  -- Sports
  (null, 'Fútbol, recreativo', 7.0, 'sports', '15610'),
  (null, 'Fútbol, competitivo', 9.5, 'sports', '15605'),
  (null, 'Básquet, general', 7.5, 'sports', '15055'),
  (null, 'Tenis, general', 6.8, 'sports', '15675'),
  (null, 'Vóley, general', 4.0, 'sports', '15710'),
  -- Swimming
  (null, 'Natación en pileta, crol lento', 5.8, 'swimming', '18240'),
  (null, 'Natación, recreativa', 6.0, 'swimming', '18310'),
  -- Dance
  (null, 'Clase de zumba', 6.5, 'dance', '02310');
