-- ============================================================
-- PERSONALIZATION: Edit values below to customize the site.
-- See README.md for full guide on replacing photos & messages.
-- ============================================================

INSERT INTO site_config (config_key, config_value) VALUES
('HER_NAME', 'Beautiful'),
('MY_NAME', 'Your Name'),
('HERO_LINE_1', 'Some people make the world beautiful just by being in it.'),
('HERO_LINE_2', 'And somehow, I got lucky enough to find you.'),
('OPENING_LINE_1', 'Hey beautiful... ❤️'),
('OPENING_LINE_2', 'I made a little universe for you.'),
('FINAL_LINE_1', 'Before you go...'),
('FINAL_LINE_2', 'I just wanted you to know...'),
('FINAL_LINE_3', 'You are incredibly special.'),
('FINAL_LINE_4', 'And I''m really glad you exist.'),
('FINAL_MESSAGE', 'You mean more to me than words on a screen could ever say — but I tried anyway.'),
('FOOTER_CREDIT', 'Made with ❤️, caffeine, Java, and way too many thoughts about you.'),
('FLOWER_MESSAGE', 'Every day with you feels like spring arrived early.'),
('SECRET_MESSAGE', 'You found the secret heart. That means you''re officially the most curious, wonderful person I know.'),
('MUSIC_URL', '/assets/audio/background.mp3'),
('HERO_IMAGE_URL', '/assets/images/hero/hero.jpg'),
('ENTRY_LOCK_QUESTION', 'What''s the nickname only I call you? ❤️');

INSERT INTO memories (title, message, memory_date, location, image_url, display_order) VALUES
('The day everything changed', 'I still remember how the world felt quieter and louder at the same time — because you were in it.', '2024-01-15', 'Where we met', '/assets/images/memories/memory-1.jpg', 1),
('Our first adventure', 'We laughed until our cheeks hurt and I knew I wanted more days exactly like that one.', '2024-03-20', 'Our favourite place', '/assets/images/memories/memory-2.jpg', 2),
('A quiet evening', 'Nothing extraordinary happened — and somehow that made it extraordinary.', '2024-06-08', NULL, '/assets/images/memories/memory-3.jpg', 3),
('The look on your face', 'That smile. I''d frame it if I could.', '2024-09-12', NULL, '/assets/images/memories/memory-4.jpg', 4);

INSERT INTO photos (title, caption, image_url, display_order) VALUES
('Us', 'My favourite view.', '/assets/images/gallery/photo-1.jpg', 1),
('Sunset', 'Golden hour with you hits different.', '/assets/images/gallery/photo-2.jpg', 2),
('Adventure', 'Every road is better with you.', '/assets/images/gallery/photo-3.jpg', 3),
('Candid', 'Caught you being adorable again.', '/assets/images/gallery/photo-4.jpg', 4),
('Together', 'Home is wherever you are.', '/assets/images/gallery/photo-5.jpg', 5),
('Smile', 'The one that ruins my concentration.', '/assets/images/gallery/photo-6.jpg', 6);

INSERT INTO quotes (text, author, display_order) VALUES
('If I could give you one thing, I''d let you see yourself through my eyes.', NULL, 1),
('You are my sun, my moon, and all my stars.', 'E.E. Cummings', 2),
('In all the world, there is no heart for me like yours.', NULL, 3),
('I have loved you for a thousand years, and I''ll love you for a thousand more.', NULL, 4),
('Every love story is beautiful, but ours is my favourite.', NULL, 5),
('You are the finest, loveliest, tenderest, and most beautiful person I have ever known.', 'F. Scott Fitzgerald', 6);

INSERT INTO love_bombs (message, display_order) VALUES
('You''re ridiculously adorable.', 1),
('Your smile has no business being this pretty.', 2),
('Just a reminder: someone is thinking about you.', 3),
('You''re my favourite notification.', 4),
('Plot twist: I still like you more today.', 5),
('You''re the kind of person people write songs about.', 6),
('Your smile could probably fix my worst day.', 7),
('I hope you know how loved you are.', 8),
('The world is genuinely better because you''re in it.', 9),
('You make ordinary moments feel like magic.', 10);

INSERT INTO reasons (short_label, long_message, display_order) VALUES
('Your smile', 'It''s the first thing I think about in the morning and the last thing I picture at night. It could light up the darkest room.', 1),
('Your kindness', 'The way you care about people — even strangers — reminds me every day why I fell for you.', 2),
('The way you talk', 'Your voice, your laugh, the way you tell stories — I could listen to you forever and never get bored.', 3),
('Your beautiful heart', 'You feel things deeply and love fiercely. That vulnerability is the bravest, most beautiful thing about you.', 4),
('How effortlessly adorable you are', 'You don''t even try. You just exist and somehow become the cutest person in every room.', 5),
('The way you make ordinary moments special', 'Grocery shopping, rainy days, lazy Sundays — with you, everything becomes a memory worth keeping.', 6);

INSERT INTO open_when_messages (envelope_label, message, display_order) VALUES
('Open when you''re smiling', 'I love that smile. Keep it — the world needs more of it. And so do I. 💛', 1),
('Open when you''re sad', 'Hey. It''s okay to not be okay. I''m here, always. This feeling will pass, but my love for you won''t.', 2),
('Open when you miss me', 'I miss you too. Right now. Close your eyes — I''m sending you the biggest hug across whatever distance is between us.', 3),
('Open when you''ve had a difficult day', 'You survived today. That''s enough. Rest now. Tomorrow doesn''t need your energy tonight — you do.', 4),
('Open when you can''t sleep', 'Count stars, not worries. I''m probably awake too, thinking about how lucky I am. Sweet dreams, beautiful.', 5),
('Open when you need to remember how special you are', 'You are rare. You are valued. You are loved beyond measure. Never forget that — especially on the days you doubt it.', 6);
