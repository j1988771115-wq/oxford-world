-- Update master-space-age-capital course thumbnail to local generated cover
-- Generated 2026-04-30 via gpt-image-2 (1536x1024, navy+gold, 久方武院長 × 牛津視界)
-- Source file: public/covers/main-space-age-capital.png (commit with this migration)

update public.courses
set thumbnail_url = '/covers/main-space-age-capital.png'
where slug = 'master-space-age-capital';
