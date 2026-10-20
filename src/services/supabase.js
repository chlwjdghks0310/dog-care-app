import { createClient } from "@supabase/supabase-js";

// 로그인·기록 서버 저장(Supabase). 주소와 공개 키(anon)가 설정돼 있을 때만 켜진다 — 없으면 앱은 지금처럼 폰에만 저장.
// anon 키는 앱에 들어가도 되는 공개 키다(권한은 DB 규칙 RLS가 막음, supabase/schema.sql). service_role 키는 절대 여기 넣지 않는다.
const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
