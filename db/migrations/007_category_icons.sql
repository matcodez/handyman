-- Íconos más específicos por oficio. Solo cambia los que siguen con el ícono original,
-- para no pisar un ícono que administración haya elegido a mano.
update categories set icon_key = 'shower-head' where slug = 'plomeria' and icon_key = 'droplets';
update categories set icon_key = 'plug-zap' where slug = 'electricidad' and icon_key = 'zap';
update categories set icon_key = 'flame' where slug = 'herreria' and icon_key = 'fence';
update categories set icon_key = 'sprout' where slug = 'jardineria' and icon_key = 'trees';
update categories set icon_key = 'house' where slug = 'techado' and icon_key = 'umbrella';
update categories set icon_key = 'spray-can' where slug = 'limpieza' and icon_key = 'sparkles';
update categories set icon_key = 'snowflake' where slug = 'aire-acondicionado' and icon_key = 'air-vent';
update categories set icon_key = 'bug-off' where slug = 'control-plagas' and icon_key = 'bug';
update categories set icon_key = 'hard-hat' where slug = 'ingenieria-civil' and icon_key = 'ruler';
