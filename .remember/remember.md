# Handoff

## State
11/17 밤: 우리 아이 캐릭터 자동화가 서버에 배포·설정 완료(b5f5c1d). server/character.js(큐·Gemini·Runway·ffmpeg-static 키잉·Supabase 저장소·푸시), supabase/character.sql 실행됨, Render 변수 4개(CHARACTER_OPEN=0 잠금), 초대 코드 4개 남음(7K2Q·M9XD·R4WP·T8HN; Z3LC는 서버 시험에 씀). 서버 왕복 시험 ✅(여름이 그림일기, 후보→고르기→영상 2편→stacked 300KB). 앱: 설정→우리 강아지→"우리 아이 캐릭터"(잠김·알림 대기·코드), DogAvatarVideo custom(stacked), 통계 화면 CharacterOps 카드 + 대기자 출시 알림 라우트.
손 시험 결과 페이지: 여름이 https://claude.ai/artifact/FXjKT9iX3SLitqULyg4b8P · 말티즈 https://claude.ai/artifact/RDWYkrSW5JdKC8zhG3bPmA · 검은 믹스 https://claude.ai/artifact/TL2yPB7CEa9XoASUQcPFyW

## Next
1. 사용자 폰 실제 왕복(코드 MC-BETA-7K2Q, 푸시 포함) 결과 듣고 문구·흐름 고치기.
2. 남은 것: 3D 설정화 "입 다문 버전"(10초에서 혀 움직임), 그림일기 3프레임 루프 서버 추가 여부, 홈페이지·설명서 캐릭터 소개(출시 때), 테스터 코드 전달 문구.
3. 출시 순서: Render CHARACTER_OPEN=1 → 통계 화면 [대기자에게 출시 알림 보내기].

## Context
아티팩트에서 video·캔버스는 안 보임 → 투명 animated WebP를 files로. ffmpeg 6.0(Render)은 scale 뒤 format=rgba 필요. 손그림 견본에 테두리·포메가 새어 crayon-2 제거, IDENTITY 예시 삭제. 비용 로그 점검/캐릭터-시험/비용.log(오늘 Gemini≈$13, Runway≈$6.5). 자료용=claude-6c, 쓰레드용=claude-47.
