// 가족 공유: 초대 코드 만들기·받기, 가족 목록, 내보내기·나가기. 권한 검사는 서버(supabase/schema.sql의 함수·RLS)가 한다.
import { supabase } from "../supabase";
import { readJSON, writeJSON } from "../storage";
import { syncNow } from "./index";

const INVITE_KEY = "dogcare-invite-v1"; // 내가 만든 코드 원문(서버엔 해시만 있어서 다시 보여 주려면 이 폰에 둔다). 서버에 안 올림

const REASONS = {
  invalid: "코드를 찾을 수 없어요. 글자를 다시 확인해 주세요.",
  expired: "기간이 지난 코드예요. 가족에게 새 코드를 받아 주세요.",
  revoked: "더 이상 쓸 수 없는 코드예요. 가족이 새 코드를 만들었는지 확인해 주세요.",
  used_up: "사용 인원이 다 찬 코드예요. 가족에게 새 코드를 받아 주세요.",
  too_many: "잘못 입력한 횟수가 많아요. 15분 뒤에 다시 시도해 주세요.",
};

function friendly(error) {
  const msg = error?.message || "";
  if (/login required/.test(msg)) return "로그인이 필요해요.";
  if (/only owner/.test(msg)) return "보호자만 초대 코드를 만들 수 있어요.";
  if (/last owner/.test(msg)) return "보호자는 가족 공유에서 나갈 수 없어요.";
  if (error instanceof TypeError || /fetch|network/i.test(msg)) return "인터넷 연결을 확인하고 다시 시도해 주세요.";
  return msg || "다시 시도해 주세요.";
}
const call = async (promise) => {
  const { data, error } = await promise;
  if (error) throw new Error(friendly(error));
  return data;
};

export const normalizeCode = (code) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function createInvite(petId) {
  const data = await call(supabase.rpc("create_invite", { p: petId }));
  writeJSON(INVITE_KEY, { ...readJSON(INVITE_KEY, {}), [petId]: data });
  return data; // { code, expires_at }
}
export const savedInvite = (petId) => {
  const inv = readJSON(INVITE_KEY, {})[petId];
  return inv && new Date(inv.expires_at) > new Date() ? inv : null;
};

// 성공하면 바로 맞추기 — 그 강아지의 기록 전체를 받아 오고 화면이 새로 그려진다(dogcare-synced)
export async function acceptInvite(code) {
  const res = await call(supabase.rpc("accept_invite", { invite_code: normalizeCode(code) }));
  if (!res?.ok) throw new Error(REASONS[res?.reason] || "연결하지 못했어요.");
  await syncNow();
  return res.pet_id;
}

export const listMembers = (petId) => call(supabase.rpc("pet_member_list", { p: petId }));

export async function removeMember(petId, userId) {
  await call(supabase.from("pet_members").delete().eq("pet_id", petId).eq("user_id", userId));
}

// 나가기: 서버에서 먼저 빠진 뒤 맞추기 → 엔진이 이 폰의 사본만 지운다(다른 가족의 기록은 그대로)
export async function leavePet(petId) {
  const { data: auth } = await supabase.auth.getUser();
  await removeMember(petId, auth.user.id);
  await syncNow();
}

// 이 강아지에서 내 역할: "owner" | "family" | null(아직 백업 전이거나 로그인 안 함)
export async function myRole(petId) {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const rows = await call(supabase.from("pet_members").select("role").eq("pet_id", petId).eq("user_id", auth.user.id));
  return rows[0]?.role || null;
}
