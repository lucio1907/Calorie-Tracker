-- Spanish names for the shared activity catalog (owner_id null), matched by
-- compendium code. Only rows still holding the original English name change,
-- so a name edited by hand is kept. Logged entries snapshot the activity name
-- in label: entries of a shared activity whose label is still that English
-- name get the Spanish name too, so past days read in one language. The same
-- goes for diary entries logged by recipe serving, which snapshot the
-- English "1 serving" portion label.

create temporary table activity_names (code text primary key, english text not null, spanish text not null);

insert into activity_names (code, english, spanish)
values
  ('17160', 'Walking, leisure', 'Caminata, paseo'),
  ('17190', 'Walking, moderate pace (4.5-5.5 km/h)', 'Caminata, ritmo moderado (4,5-5,5 km/h)'),
  ('17200', 'Walking, brisk (5.6-6.3 km/h)', 'Caminata, ritmo rápido (5,6-6,3 km/h)'),
  ('17082', 'Hiking, normal pace, no load', 'Senderismo, ritmo normal, sin carga'),
  ('17131', 'Stair climbing, general', 'Subir escaleras, general'),
  ('12020', 'Jogging, self-selected pace', 'Trote, ritmo propio'),
  ('12030', 'Running, 8 km/h', 'Correr, 8 km/h'),
  ('12050', 'Running, 10 km/h', 'Correr, 10 km/h'),
  ('12070', 'Running, 11 km/h', 'Correr, 11 km/h'),
  ('12090', 'Running, 13 km/h', 'Correr, 13 km/h'),
  ('01015', 'Cycling, easy pace', 'Ciclismo, ritmo suave'),
  ('01016', 'Cycling, moderate pace', 'Ciclismo, ritmo moderado'),
  ('01200', 'Stationary bike, general', 'Bicicleta fija, general'),
  ('01270', 'Spinning class', 'Clase de spinning'),
  ('02054', 'Weight training, multiple exercises', 'Pesas, varios ejercicios'),
  ('02050', 'Weight training, vigorous (powerlifting, bodybuilding)', 'Pesas, intenso (powerlifting, fisicoculturismo)'),
  ('02040', 'Circuit training, vigorous', 'Entrenamiento en circuito, intenso'),
  ('02214', 'HIIT, vigorous (burpees, Tabata)', 'HIIT, intenso (burpees, Tabata)'),
  ('02048', 'Elliptical trainer, moderate', 'Elíptico, moderado'),
  ('02071', 'Rowing machine, moderate', 'Remo en máquina, moderado'),
  ('02175', 'Yoga, general', 'Yoga, general'),
  ('02105', 'Pilates, general', 'Pilates, general'),
  ('15610', 'Football (soccer), casual', 'Fútbol, recreativo'),
  ('15605', 'Football (soccer), competitive', 'Fútbol, competitivo'),
  ('15055', 'Basketball, general', 'Básquet, general'),
  ('15675', 'Tennis, general', 'Tenis, general'),
  ('15710', 'Volleyball, general', 'Vóley, general'),
  ('18240', 'Swimming laps, freestyle, slow', 'Natación en pileta, crol lento'),
  ('18310', 'Swimming, leisure', 'Natación, recreativa'),
  ('02310', 'Zumba class', 'Clase de zumba');

update public.activity_entries e
set label = n.spanish
from public.activities a
join activity_names n on n.code = a.compendium_code
where e.activity_id = a.id
  and a.owner_id is null
  and e.label = n.english;

update public.activities a
set name = n.spanish
from activity_names n
where a.owner_id is null
  and a.compendium_code = n.code
  and a.name = n.english;

drop table activity_names;

update public.food_entries
set portion_label = '1 porción'
where recipe_id is not null
  and portion_label = '1 serving';
