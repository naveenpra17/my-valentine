-- Run this in Neon SQL Editor after adding PNG images to the frontend repo.
-- Updates image paths from .jpg placeholders to .png personal photos.

UPDATE site_config
SET config_value = '/assets/images/hero/hero.png'
WHERE config_key = 'HERO_IMAGE_URL';

UPDATE memories SET image_url = '/assets/images/memories/memory-1.png' WHERE display_order = 1;
UPDATE memories SET image_url = '/assets/images/memories/memory-2.png' WHERE display_order = 2;
UPDATE memories SET image_url = '/assets/images/memories/memory-3.png' WHERE display_order = 3;
UPDATE memories SET image_url = '/assets/images/memories/memory-4.png' WHERE display_order = 4;

UPDATE photos SET image_url = '/assets/images/gallery/photo-1.png' WHERE display_order = 1;
UPDATE photos SET image_url = '/assets/images/gallery/photo-2.png' WHERE display_order = 2;
UPDATE photos SET image_url = '/assets/images/gallery/photo-3.png' WHERE display_order = 3;
UPDATE photos SET image_url = '/assets/images/gallery/photo-4.png' WHERE display_order = 4;
UPDATE photos SET image_url = '/assets/images/gallery/photo-5.png' WHERE display_order = 5;
UPDATE photos SET image_url = '/assets/images/gallery/photo-6.png' WHERE display_order = 6;
