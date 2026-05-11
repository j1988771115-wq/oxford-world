-- 052: 把久老師升 superadmin (JD 5/11 拍板,跟 YC 都算共同創辦人)
--
-- 之前 049 seed yupupin = instructor,後改 superadmin。
-- YC 註冊完後 JD 自己 SQL update。

update public.profiles
set role = 'superadmin'
where lower(email) in (
  'j1988771115@gmail.com',
  'jd@onlymusic.tw',
  'yupupin@gmail.com'
  -- YC 註冊完加 'yc@xxx.com' 後 JD 自己 update
);

-- 註: course_permissions 仍保留 yupupin 對太空課 owner (superadmin 也能用,沒衝突)
