// engine.js가 쓰는 서버 함수 묶음의 Supabase 버전. 권한은 DB 규칙(RLS)이 막으니 여기선 그대로 읽고 쓴다.
const PAGE = 1000; // Supabase(PostgREST)가 한 번에 주는 최대 행 수
const CHUNK = 500;

export function supabaseRemote(supabase) {
  const check = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  return {
    async myPets() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("로그인이 필요해요.");
      return check(await supabase.from("pet_members").select("pet_id,role").eq("user_id", auth.user.id)).map((r) => ({ id: r.pet_id, role: r.role }));
    },
    async createPets(ids) {
      check(await supabase.from("pets").upsert(ids.map((id) => ({ id })), { onConflict: "id", ignoreDuplicates: true }));
    },
    async pull(petIds, since) {
      const rows = [];
      for (let from = 0; ; from += PAGE) {
        let q = supabase.from("pet_items").select("pet_id,key,item,shape,value,deleted,updated_at").in("pet_id", petIds).order("updated_at").range(from, from + PAGE - 1);
        if (since) q = q.gt("updated_at", since);
        const page = check(await q);
        rows.push(...page);
        if (page.length < PAGE) return rows;
      }
    },
    async push(rows) {
      for (let i = 0; i < rows.length; i += CHUNK) {
        check(await supabase.from("pet_items").upsert(rows.slice(i, i + CHUNK), { onConflict: "pet_id,key,item" }));
      }
    },
  };
}
